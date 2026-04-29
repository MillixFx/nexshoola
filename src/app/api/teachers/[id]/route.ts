import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { name, email, phone, teacherId, qualification, designation, department, gender, address, isActive } = body
    const teacher = await prisma.teacher.findUnique({ where: { id: params.id } })
    if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await prisma.user.update({ where: { id: teacher.userId }, data: { name, email, phone, isActive } })
    const updated = await prisma.teacher.update({
      where: { id: params.id },
      data: { teacherId, qualification, designation, department, gender, address },
      include: { user: { select: { name: true, email: true, phone: true, isActive: true } } },
    })
    return NextResponse.json(updated)
  } catch (e) { return NextResponse.json({ error: "Failed to update" }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id: params.id } })
    if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await prisma.user.delete({ where: { id: teacher.userId } })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: "Failed to delete" }, { status: 500 }) }
}
