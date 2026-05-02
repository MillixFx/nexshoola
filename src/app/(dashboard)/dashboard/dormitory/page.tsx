import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DormitoryClient from "./DormitoryClient"
export const dynamic = "force-dynamic"

export default async function DormitoryPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const dorms = await prisma.dormitory.findMany({ where: { schoolId }, include: { _count: { select: { rooms: true } } }, orderBy: { name: "asc" } })
  return <DormitoryClient dorms={dorms} schoolId={schoolId} />
}
