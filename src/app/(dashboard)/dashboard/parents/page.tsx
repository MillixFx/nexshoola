import { prisma } from "@/lib/prisma"
import ParentsClient from "./ParentsClient"
export const dynamic = "force-dynamic"

export default async function ParentsPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const parents = await prisma.parent.findMany({
    where: { schoolId },
    include: {
      user: { select: { name: true, email: true, phone: true, isActive: true } },
      students: { include: { student: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  })
  return <ParentsClient parents={parents} schoolId={schoolId} />
}
