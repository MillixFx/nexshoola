import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ReportsClient from "./ReportsClient"

export default async function ReportsPage() {
  const session = await auth()
  const role = session?.user?.role ?? "STUDENT"
  if (!["ADMIN", "HEADMASTER"].includes(role)) redirect("/dashboard")

  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/dashboard")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [students, todayAttendance, transactions, payslips, school] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, isActive: true },
      include: {
        user: { select: { name: true, email: true } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.dailyAttendance.findMany({
      where: { schoolId, date: today },
      select: { status: true, studentId: true },
    }),
    prisma.transaction.findMany({
      where: { schoolId },
      select: { amount: true, type: true, method: true, date: true, description: true, note: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.staffPayslip.findMany({
      where: { schoolId },
      include: { teacher: { include: { user: { select: { name: true } } } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, address: true, phone: true, email: true },
    }),
  ])

  return (
    <ReportsClient
      students={students as any}
      todayAttendance={todayAttendance}
      transactions={transactions as any}
      payslips={payslips as any}
      schoolName={school?.name ?? "School"}
      schoolAddress={school?.address ?? ""}
      schoolPhone={school?.phone ?? ""}
    />
  )
}
