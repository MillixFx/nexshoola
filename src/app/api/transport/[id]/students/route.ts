import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: list students assigned to this transport route
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const assignments = await prisma.studentTransport.findMany({
      where: { transportId: id },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            class: { select: { name: true, section: true } },
          },
        },
      },
      orderBy: { assignedAt: "asc" },
    })

    return NextResponse.json(assignments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: assign a student to this route
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { studentId, pickupPoint } = await req.json()
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 })

    // Neon HTTP: upsert + include → findUnique + create/update, then fetch separately
    const existingAssign = await prisma.studentTransport.findUnique({ where: { studentId } })
    let assignId: string
    if (existingAssign) {
      await prisma.studentTransport.update({
        where: { studentId },
        data: { transportId: id, pickupPoint: pickupPoint ?? null },
      })
      assignId = existingAssign.id
    } else {
      const created = await prisma.studentTransport.create({
        data: { studentId, transportId: id, pickupPoint: pickupPoint ?? null },
      })
      assignId = created.id
    }
    const assignment = await prisma.studentTransport.findUnique({
      where: { id: assignId },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            class: { select: { name: true, section: true } },
          },
        },
      },
    })

    return NextResponse.json(assignment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: remove a student from this route
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const studentId = req.nextUrl.searchParams.get("studentId")
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 })

    await prisma.studentTransport.deleteMany({
      where: { studentId, transportId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
