import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/** GET /api/exam-routines?examId=... */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const examId = searchParams.get("examId")
  if (!examId) return NextResponse.json({ error: "examId required" }, { status: 400 })

  const routines = await prisma.examRoutine.findMany({
    where: { examId },
    include: {
      class:   { select: { id: true, name: true, section: true } },
      subject: { select: { id: true, title: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })

  return NextResponse.json(routines)
}

/** POST /api/exam-routines */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const allowed = ["ADMIN", "HEADMASTER", "TEACHER"]
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { examId, classId, subjectId, date, startTime, endTime, room } = await req.json()

    if (!examId || !classId || !subjectId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const routine = await prisma.examRoutine.create({
      data: {
        examId, classId, subjectId,
        date:      new Date(date),
        startTime, endTime,
        room:      room || null,
      },
      include: {
        class:   { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, title: true } },
      },
    })

    return NextResponse.json(routine, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to create routine" }, { status: 500 })
  }
}
