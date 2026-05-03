import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DormitoryClient from "./DormitoryClient"
export const dynamic = "force-dynamic"

export default async function DormitoryPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const [dorms, students] = await Promise.all([
    prisma.dormitory.findMany({
      where: { schoolId },
      include: {
        _count: { select: { rooms: true } },
        rooms: {
          include: {
            beds: {
              include: {
                students: {
                  select: { id: true, user: { select: { name: true } } },
                  take: 1,
                },
              },
              orderBy: { bedNumber: "asc" },
            },
          },
          orderBy: { roomNumber: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        dormBedId: true,
        user: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  // Normalise: add capacity alias and flatten student (first of array) onto each bed
  const normalisedDorms = dorms.map(d => ({
    ...d,
    rooms: d.rooms.map(r => ({
      ...r,
      capacity: r.bedCount,
      beds: r.beds.map(b => ({
        ...b,
        student: b.students[0] ?? null,
      })),
    })),
  }))

  return (
    <DormitoryClient
      dorms={normalisedDorms as any}
      students={students.map(s => ({
        id: s.id,
        name: s.user.name,
        hasBed: !!s.dormBedId,
      }))}
      schoolId={schoolId}
    />
  )
}
