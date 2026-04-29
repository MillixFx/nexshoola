import { prisma } from "@/lib/prisma"
import StudentsClient from "./StudentsClient"

export const dynamic = "force-dynamic"

export default async function StudentsPage() {
  // Use first school for now (single-tenant mode until subdomain routing is wired)
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""

  const [students, classes] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId },
      include: {
        user: { select: { name: true, email: true, phone: true, isActive: true } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { admissionDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
  ])

  return <StudentsClient students={students} classes={classes} schoolId={schoolId} />
}
