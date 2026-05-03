import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ReportsClient from "./ReportsClient"

export const dynamic = "force-dynamic"

export default async function ReportsPage() {
  const session = await auth()
  const role = session?.user?.role ?? "STUDENT"
  if (!["ADMIN", "HEADMASTER"].includes(role)) redirect("/dashboard")

  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/dashboard")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

  const [
    students,
    teachers,
    todayAttendance,
    monthAttendance,
    transactions,
    payslips,
    feeSlips,
    classes,
    books,
    bookIssues,
    inventoryItems,
    notices,
    school,
  ] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, isActive: true },
      include: {
        user: { select: { name: true, email: true } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.teacher.findMany({
      where: { schoolId, isActive: true },
      select: { id: true },
    }),
    prisma.dailyAttendance.findMany({
      where: { schoolId, date: today },
      select: { status: true, studentId: true },
    }),
    prisma.dailyAttendance.findMany({
      where: { schoolId, date: { gte: monthStart, lte: monthEnd } },
      select: { status: true, studentId: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { schoolId },
      select: { amount: true, type: true, method: true, date: true, description: true, note: true, studentId: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.staffPayslip.findMany({
      where: { schoolId },
      include: { teacher: { include: { user: { select: { name: true } } } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.feeSlip.findMany({
      where: { student: { schoolId } },
      select: { amount: true, paidAmount: true, status: true },
    }),
    prisma.class.findMany({
      where: { schoolId },
      include: { _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.book.findMany({
      where: { schoolId },
      select: { id: true, quantity: true, available: true },
    }),
    prisma.bookIssue.findMany({
      where: { book: { schoolId }, status: "ISSUED" },
      select: { id: true },
    }),
    prisma.inventoryItem.findMany({
      where: { schoolId },
      select: { quantity: true, unitPrice: true },
    }),
    prisma.notice.findMany({
      where: { schoolId },
      select: { id: true },
    }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, address: true, phone: true, email: true },
    }),
  ])

  const classEnrollment = classes.map(c => ({
    id: c.id,
    name: c.name,
    section: c.section,
    studentCount: c._count.students,
  }))

  const totalInventoryItems = inventoryItems.length
  const totalInventoryValue = inventoryItems.reduce((s, i) => s + (i.quantity * (i.unitPrice ?? 0)), 0)

  return (
    <ReportsClient
      students={students as any}
      teachers={teachers}
      todayAttendance={todayAttendance}
      monthAttendance={monthAttendance as any}
      transactions={transactions as any}
      payslips={payslips as any}
      feeSlips={feeSlips}
      classEnrollment={classEnrollment}
      booksTotal={books.length}
      booksAvailable={books.reduce((s, b) => s + b.available, 0)}
      activeBookIssues={bookIssues.length}
      totalInventoryItems={totalInventoryItems}
      totalInventoryValue={totalInventoryValue}
      noticesCount={notices.length}
      schoolName={school?.name ?? "School"}
      schoolAddress={school?.address ?? ""}
      schoolPhone={school?.phone ?? ""}
    />
  )
}
