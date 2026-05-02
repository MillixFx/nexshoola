import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SuggestionsClient from "./SuggestionsClient"
export const dynamic = "force-dynamic"

export default async function SuggestionsPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const suggestions = await prisma.suggestion.findMany({
    where: { schoolId },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })
  return <SuggestionsClient suggestions={suggestions} schoolId={schoolId} />
}
