import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const allowed = ["ADMIN", "HEADMASTER", "HR"]
  if (!allowed.includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const emp = await prisma.employee.findUnique({ where: { id } })
    if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { name, email, phone, employeeId, role, department, gender, address, joiningDate, isActive } = await req.json()

    await prisma.user.update({
      where: { id: emp.userId },
      data: {
        ...(name      !== undefined ? { name }      : {}),
        ...(email     !== undefined ? { email }     : {}),
        ...(phone     !== undefined ? { phone }     : {}),
        ...(isActive  !== undefined ? { isActive }  : {}),
      },
    })

    // Neon HTTP: update + select (with relation) → update then findUnique
    await prisma.employee.update({
      where: { id },
      data: {
        ...(employeeId  !== undefined ? { employeeId:  employeeId || null }  : {}),
        ...(role        !== undefined ? { role:        role || null }        : {}),
        ...(department  !== undefined ? { department:  department || null }  : {}),
        ...(gender      !== undefined ? { gender:      gender || null }      : {}),
        ...(address     !== undefined ? { address:     address || null }     : {}),
        ...(isActive    !== undefined ? { isActive }                        : {}),
        ...(joiningDate !== undefined ? { joiningDate: new Date(joiningDate) } : {}),
      },
    })
    const updated = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true, employeeId: true, role: true, department: true,
        gender: true, address: true, photo: true, joiningDate: true, isActive: true,
        user: { select: { name: true, email: true, phone: true, isActive: true, role: true } },
      },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    console.error("Update employee error:", e)
    return NextResponse.json({ error: e.message || "Failed to update." }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const allowed = ["ADMIN", "HEADMASTER"]
  if (!allowed.includes(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const emp = await prisma.employee.findUnique({ where: { id } })
    if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await prisma.user.delete({ where: { id: emp.userId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete." }, { status: 500 })
  }
}
