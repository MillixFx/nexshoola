import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import InventoryClient from "./InventoryClient"
export const dynamic = "force-dynamic"

export default async function InventoryPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const [raw, rawIssues] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { schoolId },
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.itemIssue.findMany({
      where: { item: { schoolId } },
      include: { item: { select: { name: true, unit: true } } },
      orderBy: { issueDate: "desc" },
    }),
  ])

  const items = raw.map(({ category, ...i }) => ({ ...i, category: category?.name ?? null }))

  const issues = rawIssues.map(issue => ({
    id: issue.id,
    itemId: issue.itemId,
    itemName: issue.item.name,
    itemUnit: issue.item.unit,
    recipientId: issue.recipientId,
    recipientType: issue.recipientType,
    quantity: issue.quantity,
    issueDate: issue.issueDate.toISOString(),
    status: issue.status,
  }))

  return <InventoryClient items={items} issues={issues} schoolId={schoolId} />
}
