import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SettingsClient from "./SettingsClient"
import AdmissionsDelegation from "./AdmissionsDelegation"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const [school, allStaff, currentDelegees] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId } }),
    prisma.teacher.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, userId: true, user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.userPermission.findMany({
      where: { schoolId, permission: "ADMIT_STUDENTS" },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    }),
  ])

  const staff = allStaff.map((t: typeof allStaff[0]) => ({ userId: t.userId, name: t.user.name, email: t.user.email, role: t.user.role }))
  const delegees = currentDelegees.map((p: typeof currentDelegees[0]) => ({ id: p.id, userId: p.userId, user: p.user }))

  return (
    <div className="space-y-8">
      <SettingsClient school={school} />
      <AdmissionsDelegation staff={staff} delegees={delegees} />
    </div>
  )
}
