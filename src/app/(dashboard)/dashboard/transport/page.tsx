import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TransportClient from "./TransportClient"
export const dynamic = "force-dynamic"

export default async function TransportPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const routes = await prisma.transport.findMany({ where: { schoolId }, orderBy: { routeName: "asc" } })
  return <TransportClient routes={routes} schoolId={schoolId} />
}
