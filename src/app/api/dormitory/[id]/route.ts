import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { name, type, capacity, warden } = await req.json()
    await prisma.dormitory.update({
      where: { id },
      data: { name, type, capacity: Number(capacity) || 0, warden: warden || null },
    })
    const dorm = await prisma.dormitory.findUnique({ where: { id }, include: { _count: { select: { rooms: true } } } })
    return NextResponse.json(dorm)
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.dormitory.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
