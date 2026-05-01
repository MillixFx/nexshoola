import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PUT /api/students/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, email, phone, classId, rollNumber, studentId, dateOfBirth, gender, address, bloodGroup, religion, nationality, isActive, photo } = body

    const student = await prisma.student.findUnique({ where: { id }, include: { user: true } })
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.user.update({
      where: { id: student.userId },
      data: { name, email, phone, isActive },
    })

    const updated = await prisma.student.update({
      where: { id },
      data: {
        classId: classId || null,
        rollNumber,
        studentId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        address,
        bloodGroup,
        religion,
        nationality,
        isActive,
        ...(photo !== undefined ? { photo: photo || null } : {}),
      },
      include: {
        user: { select: { name: true, email: true, phone: true, isActive: true } },
        class: { select: { name: true, section: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

// DELETE /api/students/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const student = await prisma.student.findUnique({ where: { id } })
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 })
    // Deleting the user cascades to student
    await prisma.user.delete({ where: { id: student.userId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
