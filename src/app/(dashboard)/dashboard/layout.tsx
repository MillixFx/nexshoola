import DashboardShell from "@/components/dashboard/DashboardShell"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const schoolId = session?.user?.schoolId

  const school = schoolId
    ? await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } })
    : await prisma.school.findFirst({ select: { name: true } })

  return (
    <DashboardShell
      schoolName={school?.name ?? "School"}
      userName={session?.user?.name ?? "Admin"}
      role={session?.user?.role ?? "ADMIN"}
    >
      {children}
    </DashboardShell>
  )
}
