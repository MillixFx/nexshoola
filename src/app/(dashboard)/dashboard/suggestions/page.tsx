import { prisma } from "@/lib/prisma"
import SuggestionsClient from "./SuggestionsClient"
export const dynamic = "force-dynamic"

export default async function SuggestionsPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const suggestions = await prisma.suggestion.findMany({
    where: { schoolId },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })
  return <SuggestionsClient suggestions={suggestions} schoolId={schoolId} />
}
