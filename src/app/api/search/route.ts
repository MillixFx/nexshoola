import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/search?q=...
// Returns up to 5 results per category: students, teachers, parents, classes
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const schoolId = session.user.schoolId
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json({ students: [], teachers: [], parents: [], classes: [] })

  const search = { contains: q, mode: "insensitive" as const }

  const [students, teachers, parents, classes] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [
          { user: { name: search } },
          { studentId: search },
          { rollNumber: search },
        ],
      },
      select: {
        id: true,
        studentId: true,
        user: { select: { name: true, email: true } },
        class: { select: { name: true, section: true } },
      },
      take: 5,
    }),
    prisma.teacher.findMany({
      where: {
        schoolId,
        isActive: true,
        OR: [
          { user: { name: search } },
          { user: { email: search } },
          { teacherId: search },
          { designation: search },
        ],
      },
      select: {
        id: true,
        teacherId: true,
        designation: true,
        user: { select: { name: true, email: true, role: true } },
      },
      take: 5,
    }),
    prisma.parent.findMany({
      where: {
        schoolId,
        OR: [
          { user: { name: search } },
          { user: { email: search } },
          { user: { phone: search } },
        ],
      },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
        relation: true,
      },
      take: 5,
    }),
    prisma.class.findMany({
      where: {
        schoolId,
        OR: [
          { name: search },
          { section: search },
        ],
      },
      select: {
        id: true,
        name: true,
        section: true,
        _count: { select: { students: true } },
      },
      take: 5,
    }),
  ])

  return NextResponse.json({ students, teachers, parents, classes })
}
