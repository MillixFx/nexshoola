import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SubscriptionClient from "./SubscriptionClient"

export default async function SubscriptionPage() {
  const session = await auth()
  const role = session?.user?.role
  const schoolId = session?.user?.schoolId

  // Only admins can manage subscription
  if (!["ADMIN", "HEADMASTER"].includes(role ?? "")) redirect("/dashboard")
  if (!schoolId) redirect("/dashboard")

  const [school, studentCount, platformConfig] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        plan: true,
        planExpiry: true,
        subscriptionPaidAt: true,
        subscriptionNotes: true,
        paystackRef: true,
      },
    }),
    prisma.student.count({ where: { schoolId, isActive: true } }),
    prisma.platformConfig.findFirst({
      select: { feePerStudentTermly: true, currency: true, siteName: true },
    }),
  ])

  if (!school) redirect("/dashboard")

  const feePerStudent = platformConfig?.feePerStudentTermly ?? 15
  const totalOwed = feePerStudent * studentCount
  const currency = platformConfig?.currency ?? "GHS"

  // Subscription status
  const now = new Date()
  const isActive = school.planExpiry ? school.planExpiry > now : false
  const daysLeft = school.planExpiry
    ? Math.max(0, Math.ceil((school.planExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <SubscriptionClient
      school={{
        id: school.id,
        name: school.name,
        plan: school.plan,
        planExpiry: school.planExpiry?.toISOString() ?? null,
        subscriptionPaidAt: school.subscriptionPaidAt?.toISOString() ?? null,
        subscriptionNotes: school.subscriptionNotes,
        paystackRef: school.paystackRef,
      }}
      studentCount={studentCount}
      feePerStudent={feePerStudent}
      totalOwed={totalOwed}
      currency={currency}
      isActive={isActive}
      daysLeft={daysLeft}
      userEmail={session?.user?.email ?? ""}
    />
  )
}
