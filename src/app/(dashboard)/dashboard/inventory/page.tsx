import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import InventoryClient from "./InventoryClient"
export const dynamic = "force-dynamic"

export default async function InventoryPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const raw = await prisma.inventoryItem.findMany({
    where: { schoolId },
    include: { category: { select: { name: true } } },
    orderBy: { name: "asc" },
  })
  const items = raw.map(({ category, ...i }) => ({ ...i, category: category?.name ?? null }))
  return <InventoryClient items={items} schoolId={schoolId} />
}
