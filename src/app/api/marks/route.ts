import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { ghanaGrade, ghanaRemark } from "@/lib/grading"

// GET /api/marks?examId=...&classId=...
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const examId = searchParams.get("examId")
  const classId = searchParams.get("classId")

  if (!examId || !classId) {
    return NextResponse.json({ error: "examId and classId are required" }, { status: 400 })
  }

  const schoolId = session.user.schoolId

  // Get students in this class
  const students = await prisma.student.findMany({
    where: { schoolId, classId, isActive: true },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  })

  // Get subjects for this class
  const classSubjects = await prisma.classSubject.findMany({
    where: { classId },
    include: { subject: { select: { id: true, title: true } } },
  })

  // Get existing marks
  const marks = await prisma.subjectMark.findMany({
    where: {
      examId,
      studentId: { in: students.map(s => s.id) },
    },
  })

  return NextResponse.json({ students, subjects: classSubjects.map(cs => cs.subject), marks })
}

// POST /api/marks  → upsert a single mark
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { studentId, subjectId, examId, marks } = await req.json()

  if (!studentId || !subjectId || !examId || marks === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const score = parseFloat(marks)
  // Auto-compute Ghana BECE numeric grade (1–9) and remark
  const computedGrade  = String(ghanaGrade(score))
  const computedRemark = ghanaRemark(score)

  // Neon HTTP: upsert uses implicit transaction — replace with findUnique + create/update
  const existing = await prisma.subjectMark.findUnique({
    where: { studentId_subjectId_examId: { studentId, subjectId, examId } },
  })
  let mark
  if (existing) {
    mark = await prisma.subjectMark.update({
      where: { studentId_subjectId_examId: { studentId, subjectId, examId } },
      data: { marks: score, grade: computedGrade, remark: computedRemark },
    })
  } else {
    mark = await prisma.subjectMark.create({
      data: { studentId, subjectId, examId, marks: score, grade: computedGrade, remark: computedRemark },
    })
  }

  return NextResponse.json(mark, { status: 201 })
}
