import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * GET /api/attendance/report?classId=&month=1-12&year=2025
 *
 * Returns:
 *   schoolDays  – sorted list of dates (ISO strings) where any attendance was recorded
 *   students    – [{ id, name, photo, rollNumber, records: { [dateStr]: status } }]
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const classId = searchParams.get("classId")
  const month   = parseInt(searchParams.get("month") ?? "0")   // 1-12
  const year    = parseInt(searchParams.get("year")  ?? "0")
  const schoolId = session.user.schoolId

  if (!classId || !month || !year) {
    return NextResponse.json({ error: "classId, month and year are required" }, { status: 400 })
  }

  // Date range: first day of month → first day of next month
  const from = new Date(year, month - 1, 1)
  const to   = new Date(year, month,     1)

  // Get all students in the class
  const students = await prisma.student.findMany({
    where: { schoolId, classId, isActive: true },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  })

  // Get all attendance records for the class in this month
  const records = await prisma.dailyAttendance.findMany({
    where: {
      schoolId,
      classId,
      date: { gte: from, lt: to },
    },
    select: { studentId: true, date: true, status: true },
    orderBy: { date: "asc" },
  })

  // Collect unique school days (dates where at least one record exists)
  const daySet = new Set<string>()
  for (const r of records) {
    daySet.add(r.date.toISOString().split("T")[0])
  }
  const schoolDays = Array.from(daySet).sort()

  // Build per-student record map
  const studentMap = new Map<string, Record<string, string>>()
  for (const s of students) studentMap.set(s.id, {})
  for (const r of records) {
    const day = r.date.toISOString().split("T")[0]
    const map = studentMap.get(r.studentId)
    if (map) map[day] = r.status
  }

  const result = students.map(s => ({
    id:         s.id,
    name:       s.user.name,
    photo:      s.photo,
    rollNumber: s.rollNumber,
    records:    studentMap.get(s.id) ?? {},
  }))

  return NextResponse.json({ schoolDays, students: result })
}
