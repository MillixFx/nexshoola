import { prisma } from "@/lib/prisma"
import CalendarClient from "./CalendarClient"
export const dynamic = "force-dynamic"

export default async function CalendarPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const events = await prisma.calendarEvent.findMany({ where: { schoolId }, orderBy: { startDate: "asc" } })
  return <CalendarClient events={events} schoolId={schoolId} />
}
