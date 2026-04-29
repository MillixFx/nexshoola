import { prisma } from "@/lib/prisma"
import InventoryClient from "./InventoryClient"
export const dynamic = "force-dynamic"

export default async function InventoryPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const items = await prisma.inventoryItem.findMany({ where: { schoolId }, orderBy: { name: "asc" } })
  return <InventoryClient items={items} schoolId={schoolId} />
}
