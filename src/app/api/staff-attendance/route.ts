/**
 * GET  /api/staff-attendance?date=YYYY-MM-DD  — fetch today's board
 * POST /api/staff-attendance/notify            — send absent SMS (see notify/route.ts)
 * PUT  /api/staff-attendance                  — admin manual override
 * PATCH /api/staff-attendance/settings        — update lateAfter time
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  makeStaffQrPayload,
  generateSchoolQrSecret,
} from "@/lib/staff-qr"
import QRCode from "qrcode"

// GET — attendance board + staff QR codes
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const schoolId = session.user.schoolId
  const dateParam = new URL(req.url).searchParams.get("date")
  const mode      = new URL(req.url).searchParams.get("mode") // "board" | "qr"

  // Ensure school has a QR secret
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { staffQrSecret: true, staffLateAfter: true },
  })
  let qrSecret = school?.staffQrSecret
  if (!qrSecret) {
    qrSecret = generateSchoolQrSecret()
    await prisma.school.update({ where: { id: schoolId }, data: { staffQrSecret: qrSecret } })
  }

  // ── QR code sheet for all staff ──────────────────────────────────────────
  if (mode === "qr") {
    const [teachers, employees] = await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId, isActive: true },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.employee.findMany({
        where: { schoolId, isActive: true },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { user: { name: "asc" } },
      }),
    ])

    const allStaff = [
      ...teachers.map(t => ({ ...t.user, staffType: "TEACHER", designation: (t as any).designation ?? "" })),
      ...employees.map(e => ({ ...e.user, staffType: "EMPLOYEE", designation: (e as any).role ?? "" })),
    ]

    const withQr = await Promise.all(
      allStaff.map(async (s) => {
        const payload = makeStaffQrPayload(s.id, qrSecret!)
        const dataUrl = await QRCode.toDataURL(payload, { width: 200, margin: 1 })
        return { ...s, qrDataUrl: dataUrl, qrPayload: payload }
      })
    )
    return NextResponse.json(withQr)
  }

  // ── Attendance board ─────────────────────────────────────────────────────
  const date = dateParam ? new Date(dateParam) : new Date()
  date.setHours(0, 0, 0, 0)

  const [teachers, employees, records] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId, isActive: true },
      include: { user: { select: { id: true, name: true, phone: true, role: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.employee.findMany({
      where: { schoolId, isActive: true },
      include: { user: { select: { id: true, name: true, phone: true, role: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.staffAttendance.findMany({
      where: { schoolId, date },
    }),
  ])

  const recordMap = new Map(records.map(r => [r.userId, r]))

  const board = [
    ...teachers.map(t => ({
      userId: t.user.id, name: t.user.name, phone: t.user.phone,
      role: t.user.role, staffType: "TEACHER",
      record: recordMap.get(t.user.id) ?? null,
    })),
    ...employees.map(e => ({
      userId: e.user.id, name: e.user.name, phone: e.user.phone,
      role: e.user.role, staffType: "EMPLOYEE",
      record: recordMap.get(e.user.id) ?? null,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({
    date,
    lateAfter: school?.staffLateAfter ?? "08:00",
    board,
    summary: {
      total:   board.length,
      present: board.filter(s => s.record?.status === "PRESENT").length,
      late:    board.filter(s => s.record?.status === "LATE").length,
      absent:  board.filter(s => !s.record || s.record.status === "ABSENT").length,
      onLeave: board.filter(s => s.record?.status === "LEAVE").length,
    },
  })
}

// PUT — admin manual override (mark absent/leave/present)
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "HEADMASTER" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, date, status, note } = await req.json()
  const d = new Date(date); d.setHours(0, 0, 0, 0)

  const existing = await prisma.staffAttendance.findUnique({
    where: { userId_date: { userId, date: d } },
  })

  const staffType = await prisma.user.findUnique({
    where: { id: userId },
    select: { teacher: { select: { id: true } } },
  }).then(u => u?.teacher ? "TEACHER" : "EMPLOYEE")

  const record = existing
    ? await prisma.staffAttendance.update({
        where: { userId_date: { userId, date: d } },
        data: { status, note: note ?? null },
      })
    : await prisma.staffAttendance.create({
        data: {
          schoolId: session.user.schoolId,
          userId, staffType, date: d, status, note: note ?? null,
        },
      })

  return NextResponse.json(record)
}

// PATCH — update school's late-after time
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "HEADMASTER" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { lateAfter } = await req.json()
  // Validate HH:MM
  if (!/^\d{2}:\d{2}$/.test(lateAfter)) {
    return NextResponse.json({ error: "lateAfter must be HH:MM" }, { status: 400 })
  }

  await prisma.school.update({
    where: { id: session.user.schoolId },
    data:  { staffLateAfter: lateAfter },
  })
  return NextResponse.json({ ok: true, lateAfter })
}
