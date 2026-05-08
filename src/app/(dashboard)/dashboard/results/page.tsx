import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ResultsClient from "./ResultsClient"

export const dynamic = "force-dynamic"

export default async function ResultsPage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!role || role === "STUDENT" || role === "PARENT") redirect("/dashboard")

  const schoolId = session?.user?.schoolId ?? ""

  const [exams, classes] = await Promise.all([
    prisma.exam.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, term: true, academicYear: true },
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }, { section: "asc" }],
      select: { id: true, name: true, section: true },
    }),
  ])

  return <ResultsClient exams={exams} classes={classes} />
}
