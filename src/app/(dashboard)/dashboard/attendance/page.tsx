import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AttendanceClient from "./AttendanceClient"

export const dynamic = "force-dynamic"

export default async function AttendancePage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  // Get the teacher record for the current user (if they are a teacher / class master)
  const teacherRecord = session.user.role === "TEACHER"
    ? await prisma.teacher.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })
    : null

  const [classes, recentAttendance, teachers] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      select: {
        id: true, name: true, section: true,
        classTeacher: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.dailyAttendance.findMany({
      where: { schoolId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.teacher.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  return (
    <AttendanceClient
      classes={classes}
      recentAttendance={recentAttendance}
      teachers={teachers}
      schoolId={schoolId}
      currentRole={session.user.role as string}
      currentTeacherId={teacherRecord?.id ?? null}
    />
  )
}
