import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import ExamsClient from "./ExamsClient"
export const dynamic = "force-dynamic"

export default async function ExaminationsPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId ?? ""
  const role = session?.user?.role ?? "STUDENT"
  const isAdmin = ["ADMIN", "HEADMASTER"].includes(role)

  const [exams, classes, subjects] = await Promise.all([
    prisma.exam.findMany({
      where: { schoolId },
      include: {
        routines: { include: { subject: { select: { title: true } }, class: { select: { name: true, section: true } } } },
        _count: { select: { routines: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { title: "asc" } }),
  ])

  return <ExamsClient exams={exams as any} classes={classes} subjects={subjects} schoolId={schoolId} isAdmin={isAdmin} />
}
