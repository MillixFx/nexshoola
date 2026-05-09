/**
 * POST /api/staff-attendance/notify
 * Send SMS to all staff who are absent today (or a given date).
 * Called by admin from the attendance board.
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/lib/sms"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "HEADMASTER" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const schoolId = session.user.schoolId
  const { date: dateParam } = await req.json().catch(() => ({}))
  const date = dateParam ? new Date(dateParam) : new Date()
  date.setHours(0, 0, 0, 0)

  // Get all active staff
  const [teachers, employees] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId, isActive: true },
      include: { user: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.employee.findMany({
      where: { schoolId, isActive: true },
      include: { user: { select: { id: true, name: true, phone: true } } },
    }),
  ])

  const allStaff = [
    ...teachers.map(t => t.user),
    ...employees.map(e => e.user),
  ]

  // Get today's records
  const records = await prisma.staffAttendance.findMany({
    where: { schoolId, date },
    select: { userId: true, status: true },
  })
  const checkedIn = new Set(records.filter(r => r.status !== "ABSENT").map(r => r.userId))

  // Absent = not checked in at all OR explicitly marked ABSENT
  const absent = allStaff.filter(s => !checkedIn.has(s.id) && s.phone)

  if (absent.length === 0) {
    return NextResponse.json({ sent: 0, message: "No absent staff with phone numbers" })
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true },
  })

  const dateStr = date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
  let sent = 0

  for (const staff of absent) {
    if (!staff.phone) continue
    const msg = `Dear ${staff.name}, our records show you were absent from ${school?.name ?? "school"} on ${dateStr}. Please contact the administration if this is incorrect.`
    const result = await sendNotification({ to: staff.phone, message: msg, channel: "SMS" }).catch(() => ({ ok: false }))
    if (result.ok) sent++
  }

  return NextResponse.json({ sent, total: absent.length })
}
