import { prisma } from "@/lib/prisma"
import FinanceClient from "./FinanceClient"
export const dynamic = "force-dynamic"

export default async function FinancePage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""

  const [transactions, feeItems, students, classes] = await Promise.all([
    prisma.transaction.findMany({
      where: { schoolId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        feeItem: { select: { title: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.feeItem.findMany({
      where: { schoolId },
      include: { class: { select: { name: true, section: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.student.findMany({
      where: { schoolId },
      include: { user: { select: { name: true } } },
      orderBy: { admissionDate: "desc" },
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
  ])

  return <FinanceClient transactions={transactions} feeItems={feeItems} students={students} classes={classes} schoolId={schoolId} />
}
