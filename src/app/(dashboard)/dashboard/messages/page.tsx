import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import MessagesClient from "./MessagesClient"
export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const messages = await prisma.message.findMany({
    where: { schoolId },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  const users = await prisma.user.findMany({ where: { schoolId, isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } })
  return <MessagesClient messages={messages} users={users} schoolId={schoolId} />
}
