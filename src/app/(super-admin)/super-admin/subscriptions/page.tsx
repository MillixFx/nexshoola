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
    prisma.platformConfig.findFirst(),
  ])

  const feePerStudent = platformConfig?.feePerStudentTermly ?? 15

  const enriched = schools.map(s => ({
    ...s,
    studentCount: s._count.students,
    amountDue: s._count.students * feePerStudent,
    isPaid: !!(s.subscriptionPaidAt && new Date(s.subscriptionPaidAt) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
    isOverdue: s.plan !== "FREE" && (!s.subscriptionPaidAt || new Date(s.subscriptionPaidAt) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
  }))

  return <SubscriptionsClient schools={enriched as any} feePerStudent={feePerStudent} />
}
