import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/report-cards/bulk?classId=xxx&examId=xxx
 * Returns aggregated report-card data for every student in the class for a given exam.
 * Used by the bulk-print page to render all cards in one shot.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const classId = req.nextUrl.searchParams.get("classId")
  const examId = req.nextUrl.searchParams.get("examId")

  if (!classId || !examId) {
    return NextResponse.json({ error: "classId and examId required" }, { status: 400 })
  }

  // Fetch all active students in the class
  const students = await prisma.student.findMany({
    where: { classId, schoolId, isActive: true },
    include: {
      user: { select: { name: true } },
      class: { select: { name: true, section: true } },
      parents: {
        take: 1,
        include: { parent: { include: { user: { select: { name: true } } } } },
      },
    },
    orderBy: { user: { name: "asc" } },
  })

  // Fetch all marks for all of them in one query
  const studentIds = students.map(s => s.id)
  const marks = await prisma.subjectMark.findMany({
    where: { examId, studentId: { in: studentIds } },
    include: { subject: { select: { title: true, code: true } } },
  })

  // Compute averages and rank
  const studentAverages = students.map(s => {
    const ms = marks.filter(m => m.studentId === s.id)
    const total = ms.reduce((sum, m) => sum + m.marks, 0)
    const avg = ms.length > 0 ? total / ms.length : 0
    return { studentId: s.id, total, avg, count: ms.length }
  })

  const ranked = [...studentAverages]
    .filter(s => s.count > 0)
    .sort((a, b) => b.avg - a.avg)

  const reports = students.map(student => {
    const ms = marks
      .filter(m => m.studentId === student.id)
      .map(m => ({ subject: m.subject.title, code: m.subject.code, marks: m.marks, grade: m.grade }))
      .sort((a, b) => a.subject.localeCompare(b.subject))
    const stat = studentAverages.find(s => s.studentId === student.id)!
    const rank = ranked.findIndex(s => s.studentId === student.id) + 1
    return {
      student: {
        id: student.id,
        name: student.user.name,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        class: student.class,
        parentName: student.parents[0]?.parent.user.name ?? null,
      },
      marks: ms,
      stats: {
        total: stat.total,
        average: stat.avg,
        rank: rank > 0 ? rank : null,
        classSize: ranked.length,
      },
    }
  })

  return NextResponse.json(reports)
}
