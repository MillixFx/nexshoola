import { prisma } from "@/lib/prisma"
import SubjectsClient from "./SubjectsClient"
export const dynamic = "force-dynamic"

export default async function SubjectsPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const subjects = await prisma.subject.findMany({ where: { schoolId }, orderBy: { title: "asc" } })
  return <SubjectsClient subjects={subjects} schoolId={schoolId} />
}
