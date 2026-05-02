import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const ALLOWED_STAFF_ROLES = new Set([
  "ADMIN", "HEADMASTER", "TEACHER", "ACCOUNTANT",
  "LIBRARIAN", "HOSTEL_MANAGER", "HR", "DRIVER",
])

const teacherSelect = {
  id: true, teacherId: true, employeeId: true, qualification: true,
  designation: true, department: true, gender: true, photo: true,
  joiningDate: true, isActive: true,
  user: { select: { name: true, email: true, phone: true, isActive: true, role: true } },
} as const

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      name, email, phone, isActive,
      teacherId, qualification, designation, department,
      joiningDate, gender, address, role, photo,
    } = body

    const teacher = await prisma.teacher.findUnique({ where: { id } })
    if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.user.update({
      where: { id: teacher.userId },
      data: {
        name, email, phone,
        ...(isActive !== undefined ? { isActive } : {}),
        ...(role && ALLOWED_STAFF_ROLES.has(role) ? { role } : {}),
      },
    })

    const updated = await prisma.teacher.update({
      where: { id },
      data: {
        ...(teacherId     !== undefined ? { teacherId }     : {}),
        ...(qualification !== undefined ? { qualification } : {}),
        ...(designation   !== undefined ? { designation }   : {}),
        ...(department    !== undefined ? { department }    : {}),
        ...(gender        !== undefined ? { gender }        : {}),
        ...(address       !== undefined ? { address }       : {}),
        ...(photo         !== undefined ? { photo: photo || null } : {}),
        ...(joiningDate ? { joiningDate: new Date(joiningDate) } : {}),
      },
      select: teacherSelect,
    })

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const teacher = await prisma.teacher.findUnique({ where: { id } })
    if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await prisma.user.delete({ where: { id: teacher.userId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
