import { prisma } from "@/lib/prisma"
import PayrollClient from "./PayrollClient"
export const dynamic = "force-dynamic"

export default async function PayrollPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""

  const [payslips, teachers] = await Promise.all([
    prisma.staffPayslip.findMany({
      where: { schoolId },
      include: { teacher: { include: { user: { select: { name: true } } } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.teacher.findMany({
      where: { schoolId, isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  return (
    <PayrollClient
      payslips={payslips.map(p => ({
        ...p,
        allowances: p.allowances as { name: string; amount: number }[],
        deductions: p.deductions as { name: string; amount: number }[],
        teacherName: p.teacher.user.name,
      }))}
      teachers={teachers.map(t => ({ id: t.id, name: t.user.name, designation: t.designation ?? null, department: t.department ?? null }))}
      schoolId={schoolId}
      schoolName={school?.name ?? "School"}
    />
  )
}
