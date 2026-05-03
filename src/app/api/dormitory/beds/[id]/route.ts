import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// PUT /api/dormitory/beds/[id]  — assign or unassign a student
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { studentId } = await req.json()

  try {
    // Verify bed belongs to this school
    const bed = await prisma.dormitoryBed.findFirst({
      where: { id, room: { dormitory: { schoolId } } },
    })
    if (!bed) return NextResponse.json({ error: "Bed not found." }, { status: 404 })

    if (studentId) {
      // Verify student belongs to school
      const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } })
      if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 })
      // Move student to this bed (unassigns from previous bed automatically via FK)
      await prisma.student.update({
        where: { id: studentId },
        data: { dormBedId: id },
      })
    } else {
      // Unassign all students from this bed
      await prisma.student.updateMany({
        where: { dormBedId: id },
        data: { dormBedId: null },
      })
    }

    // Return updated bed with student
    const updated = await prisma.dormitoryBed.findUnique({
      where: { id },
      include: {
        students: {
          select: { id: true, user: { select: { name: true } } },
          take: 1,
        },
      },
    })

    return NextResponse.json({
      ...updated,
      student: updated?.students[0] ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed." }, { status: 500 })
  }
}
