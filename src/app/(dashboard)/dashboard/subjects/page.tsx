import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SubjectsClient from "./SubjectsClient"
export const dynamic = "force-dynamic"

export default async function SubjectsPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const subjects = await prisma.subject.findMany({ where: { schoolId }, orderBy: { title: "asc" } })
  return <SubjectsClient subjects={subjects} schoolId={schoolId} />
}
