import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import LeaveClient from "./LeaveClient"
export const dynamic = "force-dynamic"

export default async function LeavePage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const applications = await prisma.leaveApplication.findMany({
    where: { schoolId },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })
  const users = await prisma.user.findMany({ where: { schoolId, isActive: true, role: { in: ["TEACHER", "ADMIN", "HR", "ACCOUNTANT", "LIBRARIAN", "DRIVER"] } }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } })
  return <LeaveClient applications={applications} users={users} schoolId={schoolId} />
}
