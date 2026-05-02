import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import PayrollClient from "./PayrollClient"
export const dynamic = "force-dynamic"

export default async function PayrollPage() {
  const session = await auth()
  const role = (session?.user as any)?.role ?? "ADMIN"
  const userId = session?.user?.id ?? ""
  const schoolId = session?.user?.schoolId ?? ""
  const school = schoolId
    ? await prisma.school.findUnique({ where: { id: schoolId } })
    : null

  // If TEACHER, find their teacher record to filter their own payslips
  let myTeacherId: string | null = null
  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } })
    myTeacherId = teacher?.id ?? null
  }

  const [payslips, teachers] = await Promise.all([
    prisma.staffPayslip.findMany({
      where: myTeacherId ? { schoolId, teacherId: myTeacherId } : { schoolId },
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
      isTeacher={role === "TEACHER"}
    />
  )
}
