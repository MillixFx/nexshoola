import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AttendanceStatus } from "@prisma/client"
import { sendNotification, SmsTemplates } from "@/lib/sms"

// GET /api/attendance?schoolId=&classId=&date=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  const classId = searchParams.get("classId")
  const date = searchParams.get("date")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })

  const where: any = { schoolId }
  if (classId) where.classId = classId
  if (date) {
    const d = new Date(date)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.date = { gte: d, lt: next }
  }

  const records = await prisma.dailyAttendance.findMany({
    where,
    include: {
      student: { include: { user: { select: { name: true } } } },
      class: { select: { name: true, section: true } },
    },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(records)
}

// POST /api/attendance — bulk upsert
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { schoolId, classId, date, records } = body
    // records = [{ studentId, status }]
    const d = new Date(date)

    const results = await Promise.all(
      records.map(({ studentId, status, note }: { studentId: string; status: string; note?: string }) =>
        prisma.dailyAttendance.upsert({
          where: { studentId_date: { studentId, date: d } },
          create: { schoolId, classId, studentId, date: d, status: status as AttendanceStatus, note },
          update: { status: status as AttendanceStatus, note },
        })
      )
    )

    // ── SMS absence alerts to parents (best-effort, non-blocking) ──
    const absentIds = (records as { studentId: string; status: string }[])
      .filter(r => r.status === "ABSENT")
      .map(r => r.studentId)

    if (absentIds.length > 0) {
      const absent = await prisma.student.findMany({
        where: { id: { in: absentIds } },
        include: {
          user: { select: { name: true } },
          parents: { include: { parent: { include: { user: true } } } },
        },
      })
      const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
      for (const s of absent) {
        for (const sp of s.parents) {
          const parent = sp.parent.user
          if (parent.phone) {
            const msg = SmsTemplates.absenceAlert(parent.name, s.user.name, dateStr)
            sendNotification({ to: parent.phone, message: msg, channel: "SMS" }).catch(() => {})
          }
        }
      }
    }

    return NextResponse.json(results, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 })
  }
}
