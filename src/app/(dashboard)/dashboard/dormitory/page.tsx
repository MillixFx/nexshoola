import { prisma } from "@/lib/prisma"
import DormitoryClient from "./DormitoryClient"
export const dynamic = "force-dynamic"

export default async function DormitoryPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const dorms = await prisma.dormitory.findMany({ where: { schoolId }, include: { _count: { select: { beds: true } } }, orderBy: { name: "asc" } })
  return <DormitoryClient dorms={dorms} schoolId={schoolId} />
}
