import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ghanaGrade, ghanaRemark } from "@/lib/grading"

// GET /api/results?examId=&classId=
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const examId  = searchParams.get("examId")
  const classId = searchParams.get("classId")

  if (!examId || !classId) {
    return NextResponse.json({ error: "examId and classId are required" }, { status: 400 })
  }

  const schoolId = session.user.schoolId

  // ── students in class ──────────────────────────────────────────
  const students = await prisma.student.findMany({
    where: { schoolId, classId, isActive: true },
    select: { id: true, user: { select: { name: true } }, photo: true, studentId: true, rollNumber: true },
    orderBy: { user: { name: "asc" } },
  })

  if (students.length === 0) {
    return NextResponse.json({
      summary: { classAvg: 0, passRate: 0, highest: 0, lowest: 0, totalStudents: 0, markedStudents: 0, subjectCount: 0 },
      subjectAverages: [],
      gradeDistribution: [],
      topStudents: [],
    })
  }

  const studentIds = students.map(s => s.id)

  // ── marks for this exam + class ────────────────────────────────
  const marks = await prisma.subjectMark.findMany({
    where: { examId, studentId: { in: studentIds } },
    include: { subject: { select: { id: true, title: true } } },
  })

  if (marks.length === 0) {
    return NextResponse.json({
      summary: { classAvg: 0, passRate: 0, highest: 0, lowest: 0, totalStudents: students.length, markedStudents: 0, subjectCount: 0 },
      subjectAverages: [],
      gradeDistribution: [],
      topStudents: [],
    })
  }

  // ── Subject averages ──────────────────────────────────────────
  const subjectMap = new Map<string, { title: string; scores: number[] }>()
  for (const m of marks) {
    if (!subjectMap.has(m.subjectId)) {
      subjectMap.set(m.subjectId, { title: m.subject.title, scores: [] })
    }
    subjectMap.get(m.subjectId)!.scores.push(m.marks)
  }

  const subjectAverages = Array.from(subjectMap.entries()).map(([id, { title, scores }]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const passCount = scores.filter(s => s >= 40).length // Grade 1–8 = pass
    return {
      id, title,
      avg: Math.round(avg * 10) / 10,
      min: Math.min(...scores),
      max: Math.max(...scores),
      count: scores.length,
      passRate: Math.round((passCount / scores.length) * 100),
    }
  }).sort((a, b) => b.avg - a.avg)

  // ── Per-student totals ─────────────────────────────────────────
  const studentTotals = new Map<string, number[]>()
  for (const m of marks) {
    if (!studentTotals.has(m.studentId)) studentTotals.set(m.studentId, [])
    studentTotals.get(m.studentId)!.push(m.marks)
  }

  const studentAverages = students
    .filter(s => studentTotals.has(s.id))
    .map(s => {
      const scores = studentTotals.get(s.id)!
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      return { student: s, avg: Math.round(avg * 10) / 10, total: Math.round(scores.reduce((a, b) => a + b, 0)), subjects: scores.length }
    })
    .sort((a, b) => b.avg - a.avg)

  // Assign ranks (shared rank for ties)
  let rank = 1
  const rankedStudents = studentAverages.map((s, i) => {
    if (i > 0 && s.avg < studentAverages[i - 1].avg) rank = i + 1
    return { ...s, rank }
  })

  // ── Grade distribution (across all student-averages) ──────────
  const gradeCounts: Record<number, number> = { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0 }
  for (const s of rankedStudents) {
    const g = ghanaGrade(s.avg)
    gradeCounts[g] = (gradeCounts[g] ?? 0) + 1
  }

  const gradeLabels: Record<number, string> = {
    1: "Excellent", 2: "Very Good", 3: "Good",
    4: "Credit", 5: "Credit", 6: "Pass",
    7: "Pass", 8: "Pass", 9: "Fail",
  }

  const gradeDistribution = Object.entries(gradeCounts).map(([g, count]) => ({
    grade: Number(g),
    label: gradeLabels[Number(g)],
    count,
    pct: rankedStudents.length > 0 ? Math.round((count / rankedStudents.length) * 100) : 0,
  }))

  // ── Summary ────────────────────────────────────────────────────
  const allAvgs = rankedStudents.map(s => s.avg)
  const classAvg = allAvgs.length ? Math.round((allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) * 10) / 10 : 0
  const passCount = rankedStudents.filter(s => s.avg >= 40).length
  const passRate  = rankedStudents.length ? Math.round((passCount / rankedStudents.length) * 100) : 0

  return NextResponse.json({
    summary: {
      classAvg,
      passRate,
      highest: allAvgs.length ? Math.max(...allAvgs) : 0,
      lowest:  allAvgs.length ? Math.min(...allAvgs) : 0,
      totalStudents:  students.length,
      markedStudents: rankedStudents.length,
      subjectCount:   subjectAverages.length,
    },
    subjectAverages,
    gradeDistribution,
    topStudents: rankedStudents.slice(0, 10).map(s => ({
      rank: s.rank,
      id:   s.student.id,
      name: s.student.user.name,
      photo: s.student.photo,
      studentId: s.student.studentId,
      avg:  s.avg,
      total: s.total,
      subjects: s.subjects,
      grade: ghanaGrade(s.avg),
      remark: ghanaRemark(s.avg),
    })),
  })
}
