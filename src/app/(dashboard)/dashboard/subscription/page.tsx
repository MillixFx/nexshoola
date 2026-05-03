import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SubscriptionClient from "./SubscriptionClient"

export const dynamic = "force-dynamic"

export default async function SubscriptionPage() {
  const session = await auth()
  const role    = session?.user?.role
  const schoolId = session?.user?.schoolId

  if (!["ADMIN", "HEADMASTER"].includes(role ?? "")) redirect("/dashboard")
  if (!schoolId) redirect("/dashboard")

  const [school, platformConfig] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true, name: true, plan: true,
        planExpiry: true, subscriptionPaidAt: true,
        subscriptionNotes: true, paystackRef: true,
      },
    }),
    prisma.platformConfig.findFirst({
      select: {
        currency: true,
        supportEmail: true,
        planPriceBasic: true,
        planPricePro: true,
      },
    }),
  ])

  if (!school) redirect("/dashboard")

  const now      = new Date()
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
      planPrices={{
        BASIC: platformConfig?.planPriceBasic ?? 500,
        PRO:   platformConfig?.planPricePro   ?? 1200,
      }}
      currency={platformConfig?.currency ?? "GHS"}
      isActive={isActive}
      daysLeft={daysLeft}
      userEmail={session?.user?.email ?? ""}
      supportEmail={platformConfig?.supportEmail ?? ""}
    />
  )
}
