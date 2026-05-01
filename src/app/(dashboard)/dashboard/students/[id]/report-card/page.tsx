import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ReportCardClient from "./ReportCardClient"

export const dynamic = "force-dynamic"

export default async function ReportCardPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ examId?: string }>
}) {
  const { id } = await params
  const { examId } = await searchParams

  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  // Fetch student
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      class: { select: { name: true, section: true } },
      parents: {
        take: 1,
        include: { parent: { include: { user: { select: { name: true } } } } },
      },
    },
  })

  if (!student || student.schoolId !== schoolId) notFound()

  // Fetch all exams for this school (for the exam selector)
  const exams = await prisma.exam.findMany({
    where: { schoolId },
    orderBy: [{ academicYear: "desc" }, { startDate: "desc" }],
    select: { id: true, title: true, term: true, academicYear: true },
  })

  // Fetch marks for selected exam (or most recent)
  const selectedExamId = examId ?? exams[0]?.id ?? ""
  const selectedExam = exams.find(e => e.id === selectedExamId) ?? exams[0]

  const marks = selectedExamId
    ? await prisma.subjectMark.findMany({
        where: { studentId: id, examId: selectedExamId },
        include: { subject: { select: { title: true, code: true } } },
        orderBy: { subject: { title: "asc" } },
      })
    : []

  // Class rank — how many students in same class took this exam
  let rank: number | null = null
  let classSize: number | null = null
  if (selectedExamId && student.classId) {
    const classStudentIds = await prisma.student.findMany({
      where: { classId: student.classId, schoolId, isActive: true },
      select: { id: true },
    })
    const ids = classStudentIds.map(s => s.id)

    const allAverages = await prisma.subjectMark.groupBy({
      by: ["studentId"],
      where: { examId: selectedExamId, studentId: { in: ids } },
      _avg: { marks: true },
      orderBy: { _avg: { marks: "desc" } },
    })

    const myAvg = marks.length > 0 ? marks.reduce((s, m) => s + m.marks, 0) / marks.length : 0
    rank = allAverages.findIndex(a => a.studentId === id) + 1 || null
    classSize = allAverages.length
  }

  // School info
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, address: true, phone: true, email: true, logo: true },
  })

  const totalMarks = marks.reduce((s, m) => s + m.marks, 0)
  const average = marks.length > 0 ? totalMarks / marks.length : 0

  return (
    <ReportCardClient
      student={{
        id: student.id,
        name: student.user.name,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        class: student.class,
        parentName: student.parents[0]?.parent.user.name ?? null,
        admissionDate: student.admissionDate.toISOString(),
      }}
      exam={selectedExam ?? null}
      exams={exams}
      marks={marks.map(m => ({
        subject: m.subject.title,
        code: m.subject.code,
        marks: m.marks,
        grade: m.grade,
      }))}
      stats={{ total: totalMarks, average, rank, classSize }}
      school={school ?? { name: "School", address: null, phone: null, email: null, logo: null }}
    />
  )
}
