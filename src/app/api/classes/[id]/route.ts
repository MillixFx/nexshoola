import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const classInclude = {
  _count: { select: { students: true } },
  classTeacher: {
    select: { id: true, user: { select: { name: true } } },
  },
} as const

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, section, code, capacity, classTeacherId } = body
    const cls = await prisma.class.update({
      where: { id },
      data: {
        name,
        section,
        code,
        capacity: capacity ? Number(capacity) : null,
        // classTeacherId: empty string → null (unassign), string → assign, undefined → leave unchanged
        ...(classTeacherId !== undefined
          ? { classTeacherId: classTeacherId || null }
          : {}),
      },
      include: classInclude,
    })
    return NextResponse.json(cls)
  } catch (e) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.class.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
