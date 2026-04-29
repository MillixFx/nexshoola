import { prisma } from "@/lib/prisma"
import ExamsClient from "./ExamsClient"
export const dynamic = "force-dynamic"

export default async function ExaminationsPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
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
  return <ExamsClient exams={exams} classes={classes} subjects={subjects} schoolId={schoolId} />
}
