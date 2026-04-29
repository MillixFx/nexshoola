import { prisma } from "@/lib/prisma"
import AttendanceClient from "./AttendanceClient"
export const dynamic = "force-dynamic"

export default async function AttendancePage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""

  const [classes, recentAttendance] = await Promise.all([
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.dailyAttendance.findMany({
      where: { schoolId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
  ])

  return <AttendanceClient classes={classes} recentAttendance={recentAttendance} schoolId={schoolId} />
}
