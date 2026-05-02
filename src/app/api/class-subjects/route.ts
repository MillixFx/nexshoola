import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/class-subjects?classId=xxx
// Returns all ClassSubject rows for a class with subject + teacher details
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get("classId")
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 })

  const rows = await prisma.classSubject.findMany({
    where: { classId },
    include: {
      subject: { select: { id: true, title: true, code: true, group: true, isOptional: true } },
    },
    orderBy: { subject: { title: "asc" } },
  })
  return NextResponse.json(rows)
}

// PUT /api/class-subjects
// Syncs subject-teacher assignments for a class.
// Body: { classId, assignments: [{ subjectId, teacherId | null }] }
// — Upserts present subjects, deletes removed ones.
export async function PUT(req: NextRequest) {
  try {
    const { classId, assignments } = await req.json() as {
      classId: string
      assignments: { subjectId: string; teacherId: string | null }[]
    }

    if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 })

    const incomingSubjectIds = assignments.map(a => a.subjectId)

    // Delete subjects no longer in the list
    await prisma.classSubject.deleteMany({
      where: { classId, subjectId: { notIn: incomingSubjectIds } },
    })

    // Upsert each assignment
    await Promise.all(
      assignments.map(({ subjectId, teacherId }) =>
        prisma.classSubject.upsert({
          where: { classId_subjectId: { classId, subjectId } },
          create: { classId, subjectId, teacherId: teacherId || null },
          update: { teacherId: teacherId || null },
        })
      )
    )

    // Return fresh data
    const updated = await prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: { select: { id: true, title: true, code: true, group: true, isOptional: true } },
      },
      orderBy: { subject: { title: "asc" } },
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: "Failed to save subject assignments" }, { status: 500 })
  }
}
