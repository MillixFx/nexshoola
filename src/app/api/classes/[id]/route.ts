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

    // Build only the fields that were actually provided
    const data: Record<string, unknown> = {}
    if (name       !== undefined) data.name       = name
    if (section    !== undefined) data.section    = section
    if (code       !== undefined) data.code       = code
    if (capacity   !== undefined) data.capacity   = capacity ? Number(capacity) : null
    // classTeacherId: "" → null (unassign), string → assign, undefined → no change
    if (classTeacherId !== undefined) data.classTeacherId = classTeacherId || null

    const cls = await prisma.class.update({ where: { id }, data, include: classInclude })
    return NextResponse.json(cls)
  } catch (e: any) {
    console.error("Class update error:", e)
    if (e.code === "P2002") return NextResponse.json({ error: "Class name already exists." }, { status: 409 })
    if (e.code === "P2025") return NextResponse.json({ error: "Class not found." }, { status: 404 })
    return NextResponse.json({ error: e.message || "Failed to update" }, { status: 500 })
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
