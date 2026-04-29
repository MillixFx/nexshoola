import { prisma } from "@/lib/prisma"
import LeaveClient from "./LeaveClient"
export const dynamic = "force-dynamic"

export default async function LeavePage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const applications = await prisma.leaveApplication.findMany({
    where: { schoolId },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })
  const users = await prisma.user.findMany({ where: { schoolId, isActive: true, role: { in: ["TEACHER", "ADMIN", "HR", "ACCOUNTANT", "LIBRARIAN", "DRIVER"] } }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } })
  return <LeaveClient applications={applications} users={users} schoolId={schoolId} />
}
