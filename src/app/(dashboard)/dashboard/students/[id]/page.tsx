import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import StudentProfileClient from "./StudentProfileClient"

export const dynamic = "force-dynamic"

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const schoolId = session?.user?.schoolId
  const role = session?.user?.role ?? "STUDENT"

  if (!schoolId) redirect("/login")

  const [student, school] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true, isActive: true, avatar: true } },
        class: { select: { id: true, name: true, section: true } },
        parents: {
          include: {
            parent: {
              include: { user: { select: { name: true, email: true, phone: true } } }
            }
          }
        },
        attendance: {
          orderBy: { date: "desc" },
          take: 90,
          select: { date: true, status: true, note: true },
        },
        marks: {
          include: {
            subject: { select: { title: true, code: true } },
          },
          orderBy: [{ examId: "asc" }, { subject: { title: "asc" } }],
        },
        fees: {
          include: { feeItem: { select: { title: true, term: true, academicYear: true } } },
          orderBy: { dueDate: "desc" },
        },
      },
    }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, address: true, currency: true },
    }),
  ])

  if (!student || student.schoolId !== schoolId) notFound()

  // Fetch exam titles separately for marks
  const examIds = [...new Set(student.marks.map((m: any) => m.examId))]
  const exams = examIds.length
    ? await prisma.exam.findMany({
        where: { id: { in: examIds } },
        select: { id: true, title: true, term: true, academicYear: true },
      })
    : []

  const examMap = Object.fromEntries(exams.map((e: any) => [e.id, e]))

  // Attendance stats
  const totalDays = student.attendance.length
  const present = student.attendance.filter((a: any) => a.status === "PRESENT").length
  const absent = student.attendance.filter((a: any) => a.status === "ABSENT").length
  const late = student.attendance.filter((a: any) => a.status === "LATE").length
  const attendanceRate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0

  // Fee stats
  const totalFees = student.fees.reduce((s: number, f: any) => s + f.amount, 0)
  const paidFees = student.fees.filter((f: any) => f.status === "PAID").reduce((s: number, f: any) => s + f.paidAmount, 0)

  const isAdmin = ["ADMIN", "HEADMASTER"].includes(role)

  return (
    <StudentProfileClient
      student={{
        id: student.id,
        rollNumber: student.rollNumber,
        studentId: student.studentId,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth?.toISOString() ?? null,
        address: student.address,
        bloodGroup: student.bloodGroup,
        religion: student.religion,
        nationality: student.nationality,
        admissionDate: student.admissionDate.toISOString(),
        isActive: student.isActive,
        user: student.user,
        class: student.class,
        parents: student.parents.map((sp: any) => ({
          relation: sp.relation,
          parent: {
            occupation: sp.parent.occupation,
            phone: sp.parent.phone,
            user: sp.parent.user,
          },
        })),
        attendance: student.attendance.map((a: any) => ({
          date: a.date.toISOString(),
          status: a.status,
          note: a.note,
        })),
        marks: student.marks.map((m: any) => ({
          id: m.id,
          examId: m.examId,
          examTitle: examMap[m.examId]?.title ?? "Exam",
          examTerm: examMap[m.examId]?.term ?? null,
          subject: m.subject.title,
          subjectCode: m.subject.code,
          marks: m.marks,
          grade: m.grade,
        })),
        fees: student.fees.map((f: any) => ({
          id: f.id,
          title: f.feeItem.title,
          term: f.feeItem.term,
          academicYear: f.feeItem.academicYear,
          amount: f.amount,
          paidAmount: f.paidAmount,
          status: f.status,
          dueDate: f.dueDate?.toISOString() ?? null,
          paidAt: f.paidAt?.toISOString() ?? null,
          paystackRef: f.paystackRef,
        })),
      }}
      stats={{ totalDays, present, absent, late, attendanceRate, totalFees, paidFees }}
      school={school ?? { name: "School", address: null, currency: "GHS" }}
      isAdmin={isAdmin}
    />
  )
}
