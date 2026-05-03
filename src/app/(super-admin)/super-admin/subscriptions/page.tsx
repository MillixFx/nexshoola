import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SubscriptionsClient from "./SubscriptionsClient"

export const dynamic = "force-dynamic"

export default async function SubscriptionsPage() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/login")

  const [schools, platformConfig] = await Promise.all([
    prisma.school.findMany({
      include: { _count: { select: { students: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.platformConfig.findFirst({
      select: {
        planPriceBasic: true,
        planPricePro: true,
        planPriceEnterprise: true,
        currency: true,
      },
    }),
  ])

  const planPrices = {
    BASIC:      platformConfig?.planPriceBasic      ?? 500,
    PRO:        platformConfig?.planPricePro        ?? 1200,
    ENTERPRISE: platformConfig?.planPriceEnterprise ?? 2500,
  }

  const now = new Date()

  const enriched = schools.map(s => {
    const isPaid = !!(s.planExpiry && s.planExpiry > now)
    const isOverdue = s.plan !== "FREE" && !isPaid
    const planPrice = s.plan === "ENTERPRISE"
      ? planPrices.ENTERPRISE
      : s.plan === "PRO"
        ? planPrices.PRO
        : s.plan === "BASIC"
          ? planPrices.BASIC
          : 0

    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      plan: s.plan,
      isActive: s.isActive,
      createdAt: s.createdAt,
      subscriptionPaidAt: s.subscriptionPaidAt,
      subscriptionNotes: s.subscriptionNotes,
      planExpiry: s.planExpiry,
      studentCount: s._count.students,
      planPrice,
      isPaid,
      isOverdue,
    }
  })

  return (
    <SubscriptionsClient
      schools={enriched as any}
      planPrices={planPrices}
      currency={platformConfig?.currency ?? "GHS"}
    />
  )
}
