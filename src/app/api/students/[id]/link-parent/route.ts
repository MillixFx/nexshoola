import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// POST /api/students/[id]/link-parent
// Body: { type: "existing", parentId } | { type: "new", name, email, phone, relation, occupation, address }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: studentId } = await params
  const body = await req.json()

  // Verify student belongs to this school
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student || student.schoolId !== session.user.schoolId) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 })
  }

  try {
    if (body.type === "existing") {
      const { parentId, relation } = body as { type: "existing"; parentId: string; relation?: string }

      // Verify parent belongs to this school
      const parent = await prisma.parent.findUnique({ where: { id: parentId } })
      if (!parent || parent.schoolId !== session.user.schoolId) {
        return NextResponse.json({ error: "Parent not found" }, { status: 404 })
      }

      await prisma.studentParent.upsert({
        where: { studentId_parentId: { studentId, parentId } },
        create: { studentId, parentId, relation: relation || null },
        update: { relation: relation || null },
      })

      return NextResponse.json({ ok: true })
    }

    if (body.type === "new") {
      const { name, email, phone, relation, occupation, address } = body as {
        type: "new"
        name: string
        email?: string
        phone: string
        relation?: string
        occupation?: string
        address?: string
      }

      if (!phone?.trim()) {
        return NextResponse.json({ error: "Phone number is required for the parent." }, { status: 400 })
      }

      // Email is optional — auto-generate a unique placeholder if not provided
      const resolvedEmail = email?.trim()
        || `parent_${phone.trim().replace(/\D/g, "")}_${Date.now()}@noreply.local`

      const hashed = await bcrypt.hash("changeme123", 10)

      const user = await prisma.user.create({
        data: {
          schoolId: session.user.schoolId,
          name,
          email: resolvedEmail,
          password: hashed,
          phone: phone.trim(),
          role: "PARENT",
          parent: {
            create: {
              schoolId: session.user.schoolId,
              relation: relation || "Parent",
              occupation: occupation || null,
              address: address || null,
            },
          },
        },
        include: { parent: true },
      })

      const parentId = user.parent!.id

      await prisma.studentParent.create({
        data: { studentId, parentId, relation: relation || null },
      })

      return NextResponse.json({ ok: true, parentId }, { status: 201 })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (e: any) {
    console.error("link-parent error:", e)
    if (e.code === "P2002") {
      return NextResponse.json({ error: "A user with this email already exists in this school." }, { status: 409 })
    }
    return NextResponse.json({ error: e.message || "Failed to link parent" }, { status: 500 })
  }
}

// DELETE /api/students/[id]/link-parent
// Body: { parentId }
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: studentId } = await params
  const { parentId } = await req.json() as { parentId: string }

  // Verify student belongs to this school
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student || student.schoolId !== session.user.schoolId) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 })
  }

  try {
    await prisma.studentParent.delete({
      where: { studentId_parentId: { studentId, parentId } },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to unlink parent" }, { status: 500 })
  }
}
