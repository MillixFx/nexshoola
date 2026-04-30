import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import FinanceClient from "./FinanceClient"
export const dynamic = "force-dynamic"

export default async function FinancePage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId ?? ""
  const role = session?.user?.role ?? "STUDENT"
  const isAdmin = ["ADMIN", "HEADMASTER", "ACCOUNTANT"].includes(role)

  const [rawTx, feeItems, students, classes] = await Promise.all([
    prisma.transaction.findMany({
      where: { schoolId },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.feeItem.findMany({
      where: { schoolId },
      include: { class: { select: { name: true, section: true } } },
      orderBy: { title: "asc" },
    }),
    isAdmin ? prisma.student.findMany({
      where: { schoolId },
      include: { user: { select: { name: true } } },
      orderBy: { admissionDate: "desc" },
    }) : Promise.resolve([]),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
  ])

  // Build lookup maps for student names and fee item titles
  const studentMap = new Map(students.map((s: any) => [s.id, s.user.name as string]))
  const feeMap = new Map(feeItems.map(f => [f.id, { title: f.title, amount: f.amount }]))

  const transactions = rawTx.map(t => ({
    ...t,
    studentName: t.studentId ? (studentMap.get(t.studentId) ?? null) : null,
    feeItemTitle: t.feeItemId ? (feeMap.get(t.feeItemId)?.title ?? null) : null,
  }))

  return (
    <FinanceClient
      transactions={transactions}
      feeItems={feeItems}
      students={students as any}
      classes={classes}
      schoolId={schoolId}
      isAdmin={isAdmin}
      userEmail={session?.user?.email ?? ""}
    />
  )
}
