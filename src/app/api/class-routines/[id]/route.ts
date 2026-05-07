import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const routineInclude = {
  subject: { select: { id: true, title: true, code: true, group: true } },
} as const

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { subjectId, teacherId, day, startTime, endTime, room } = await req.json()

    await prisma.classRoutine.update({
      where: { id },
      data: {
        ...(subjectId  !== undefined ? { subjectId }              : {}),
        ...(teacherId  !== undefined ? { teacherId: teacherId || null } : {}),
        ...(day        !== undefined ? { day }                    : {}),
        ...(startTime  !== undefined ? { startTime }              : {}),
        ...(endTime    !== undefined ? { endTime }                : {}),
        ...(room       !== undefined ? { room: room || null }     : {}),
      },
    })
    const routine = await prisma.classRoutine.findUnique({ where: { id }, include: routineInclude })

    return NextResponse.json(routine)
  } catch (e) {
    return NextResponse.json({ error: "Failed to update period" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.classRoutine.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete period" }, { status: 500 })
  }
}
