import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TimetableClient from "./TimetableClient"

export const dynamic = "force-dynamic"

export default async function TimetablePage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const role  = session?.user?.role ?? "TEACHER"
  const userId = session?.user?.id ?? ""

  const [classes, subjects, teachers] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, section: true },
      orderBy: [{ name: "asc" }, { section: "asc" }],
    }),
    prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, title: true, code: true, group: true },
      orderBy: { title: "asc" },
    }),
    prisma.teacher.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  // If teacher role, find their teacher record for "My Schedule" view
  let myTeacherId: string | null = null
  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      select: { id: true },
    })
    myTeacherId = teacher?.id ?? null
  }

  const canEdit = role === "ADMIN" || role === "HEADMASTER"

  return (
    <TimetableClient
      classes={classes}
      subjects={subjects}
      teachers={teachers}
      canEdit={canEdit}
      myTeacherId={myTeacherId}
    />
  )
}
