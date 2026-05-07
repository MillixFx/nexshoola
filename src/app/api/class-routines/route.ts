import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const routineInclude = {
  subject: { select: { id: true, title: true, code: true, group: true } },
} as const

// GET /api/class-routines?classId=xxx  OR  ?teacherId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const classId   = searchParams.get("classId")
  const teacherId = searchParams.get("teacherId")

  if (!classId && !teacherId) {
    return NextResponse.json({ error: "classId or teacherId required" }, { status: 400 })
  }

  const where: any = {}
  if (classId)   where.classId   = classId
  if (teacherId) where.teacherId = teacherId

  const routines = await prisma.classRoutine.findMany({
    where,
    include: routineInclude,
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  })

  return NextResponse.json(routines)
}

// POST /api/class-routines
// Body: { classId, subjectId, teacherId?, day, startTime, endTime, room? }
export async function POST(req: NextRequest) {
  try {
    const { classId, subjectId, teacherId, day, startTime, endTime, room } = await req.json()

    if (!classId || !subjectId || !day || !startTime || !endTime) {
      return NextResponse.json({ error: "classId, subjectId, day, startTime, endTime required" }, { status: 400 })
    }

    const created = await prisma.classRoutine.create({
      data: {
        classId,
        subjectId,
        teacherId: teacherId || null,
        day,
        startTime,
        endTime,
        room: room || null,
      },
    })
    const routine = await prisma.classRoutine.findUnique({ where: { id: created.id }, include: routineInclude })

    return NextResponse.json(routine, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: "Failed to create period" }, { status: 500 })
  }
}
