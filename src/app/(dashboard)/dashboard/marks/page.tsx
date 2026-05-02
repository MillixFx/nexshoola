import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import MarksClient from "./MarksClient"

export const metadata = { title: "Grade Book" }

export default async function MarksPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const { schoolId, role } = session.user

  // Only staff who deal with academics can access
  const allowed = ["ADMIN", "HEADMASTER", "TEACHER"]
  if (!allowed.includes(role)) redirect("/dashboard")

  const canEdit = ["ADMIN", "HEADMASTER", "TEACHER"].includes(role)

  const [classes, exams] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, section: true },
    }),
    prisma.exam.findMany({
      where: { schoolId },
      orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, term: true, academicYear: true },
    }),
  ])

  return <MarksClient classes={classes} exams={exams} canEdit={canEdit} />
}
