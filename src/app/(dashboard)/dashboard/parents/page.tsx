import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ParentsClient from "./ParentsClient"
export const dynamic = "force-dynamic"

export default async function ParentsPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const [parents, students] = await Promise.all([
    prisma.parent.findMany({
      where: { schoolId },
      include: {
        user: { select: { name: true, email: true, phone: true, isActive: true } },
        students: {
          include: {
            student: {
              select: { id: true, user: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        user: { select: { name: true } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  return <ParentsClient parents={parents} students={students} schoolId={schoolId} />
}
