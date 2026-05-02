import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ClassesClient from "./ClassesClient"

export const dynamic = "force-dynamic"

export default async function ClassesPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const [classes, teachers, subjects] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      include: {
        _count: { select: { students: true } },
        classTeacher: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, title: true, code: true, group: true, isOptional: true },
      orderBy: { title: "asc" },
    }),
  ])

  return <ClassesClient classes={classes} teachers={teachers} subjects={subjects} schoolId={schoolId} />
}
