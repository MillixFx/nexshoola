import { prisma } from "@/lib/prisma"
import ClassesClient from "./ClassesClient"

export const dynamic = "force-dynamic"

export default async function ClassesPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""

  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: { _count: { select: { students: true } } },
    orderBy: { name: "asc" },
  })

  return <ClassesClient classes={classes} schoolId={schoolId} />
}
