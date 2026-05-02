import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CalendarClient from "./CalendarClient"
export const dynamic = "force-dynamic"

export default async function CalendarPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const events = await prisma.calendarEvent.findMany({ where: { schoolId }, orderBy: { startDate: "asc" } })
  return <CalendarClient events={events} schoolId={schoolId} />
}
