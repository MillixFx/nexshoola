import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import NotificationsClient from "./NotificationsClient"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  if (!["ADMIN", "HEADMASTER"].includes(session.user.role ?? "")) redirect("/dashboard")

  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, section: true },
    orderBy: [{ name: "asc" }],
  })

  return <NotificationsClient classes={classes} />
}
