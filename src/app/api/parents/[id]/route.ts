import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const parentInclude = {
  user: { select: { name: true, email: true, phone: true, isActive: true } },
  students: {
    include: { student: { select: { id: true, user: { select: { name: true } } } } },
  },
} as const

/** DELETE /api/parents/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const allowed = ["ADMIN", "HEADMASTER"]
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const parent = await prisma.parent.findUnique({ where: { id } })
    if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 })
    // Deleting the user cascades to parent record
    await prisma.user.delete({ where: { id: parent.userId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("Delete parent error:", e)
    return NextResponse.json({ error: e.message || "Failed to delete parent." }, { status: 500 })
  }
}

/** PATCH /api/parents/[id] — link/unlink a student */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id: parentId } = await params
    const { action, studentId } = await req.json()

    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 })

    if (action === "link") {
      // Neon HTTP: upsert uses implicit transaction — replace with findUnique + conditional create
      const existing = await prisma.studentParent.findUnique({
        where: { studentId_parentId: { studentId, parentId } },
      })
      if (!existing) {
        await prisma.studentParent.create({ data: { studentId, parentId } })
      }
    } else if (action === "unlink") {
      await prisma.studentParent.deleteMany({ where: { studentId, parentId } })
    } else {
      return NextResponse.json({ error: "action must be 'link' or 'unlink'" }, { status: 400 })
    }

    // Return updated parent with students
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      include: parentInclude,
    })
    return NextResponse.json(parent)
  } catch (e: any) {
    console.error("Link parent error:", e)
    return NextResponse.json({ error: e.message || "Failed to update link." }, { status: 500 })
  }
}
