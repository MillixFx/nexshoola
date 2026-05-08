import DashboardShell from "@/components/dashboard/DashboardShell"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // SUPER_ADMIN belongs in the super-admin console, not the school dashboard
  if (session?.user?.role === "SUPER_ADMIN") redirect("/super-admin")

  const schoolId = session?.user?.schoolId

  const [school, notices] = await Promise.all([
    schoolId
      ? prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } })
      : prisma.school.findFirst({ select: { name: true, id: true } }),
    prisma.notice.findMany({
      where: { schoolId: schoolId ?? undefined },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, content: true, priority: true, createdAt: true },
    }),
  ])

  return (
    <DashboardShell
      schoolName={school?.name ?? "School"}
      userName={session?.user?.name ?? "Admin"}
      role={session?.user?.role ?? "ADMIN"}
      notices={notices}
    >
      {children}
    </DashboardShell>
  )
}
