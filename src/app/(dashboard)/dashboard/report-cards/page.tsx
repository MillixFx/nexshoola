import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import BulkReportCardsClient from "./BulkReportCardsClient"

export const dynamic = "force-dynamic"

export default async function BulkReportCardsPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const [classes, exams, school] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, section: true },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    }),
    prisma.exam.findMany({
      where: { schoolId },
      select: { id: true, title: true, term: true, academicYear: true },
      orderBy: [{ academicYear: "desc" }, { startDate: "desc" }],
    }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, address: true, phone: true, email: true, logo: true },
    }),
  ])

  return (
    <BulkReportCardsClient
      classes={classes}
      exams={exams}
      school={school ?? { name: "School", address: null, phone: null, email: null, logo: null }}
    />
  )
}
