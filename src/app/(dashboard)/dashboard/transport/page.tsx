import { prisma } from "@/lib/prisma"
import TransportClient from "./TransportClient"
export const dynamic = "force-dynamic"

export default async function TransportPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const routes = await prisma.transport.findMany({ where: { schoolId }, orderBy: { routeName: "asc" } })
  return <TransportClient routes={routes} schoolId={schoolId} />
}
