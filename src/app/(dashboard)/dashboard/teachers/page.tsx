import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TeachersClient from "./TeachersClient"

export const dynamic = "force-dynamic"

export default async function TeachersPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const [school, teachers] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, logo: true, address: true, phone: true, email: true, headmaster: true },
    }),
    prisma.teacher.findMany({
      where: { schoolId },
      select: {
        id: true, teacherId: true, employeeId: true, qualification: true,
        designation: true, department: true, gender: true, photo: true,
        joiningDate: true, isActive: true,
        user: { select: { name: true, email: true, phone: true, isActive: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return <TeachersClient teachers={teachers} schoolId={schoolId} school={school} />
}
