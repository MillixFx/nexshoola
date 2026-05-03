import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TransportClient from "./TransportClient"
export const dynamic = "force-dynamic"

export default async function TransportPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const [routes, students] = await Promise.all([
    prisma.transport.findMany({ where: { schoolId }, orderBy: { routeName: "asc" } }),
    prisma.student.findMany({
      where: { schoolId, isActive: true },
      include: {
        user: { select: { name: true } },
        class: { select: { name: true, section: true } },
        transport: { select: { transportId: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  const studentsForClient = students.map(s => ({
    id: s.id,
    name: s.user.name,
    className: s.class ? `${s.class.name}${s.class.section ? ` ${s.class.section}` : ""}` : null,
    currentTransportId: s.transport?.transportId ?? null,
  }))

  return <TransportClient routes={routes} students={studentsForClient} schoolId={schoolId} />
}
