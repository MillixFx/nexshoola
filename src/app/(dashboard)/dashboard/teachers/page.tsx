import { prisma } from "@/lib/prisma"
import TeachersClient from "./TeachersClient"

export const dynamic = "force-dynamic"

export default async function TeachersPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    include: { user: { select: { name: true, email: true, phone: true, isActive: true } } },
    orderBy: { createdAt: "desc" },
  })
  return <TeachersClient teachers={teachers} schoolId={schoolId} />
}
