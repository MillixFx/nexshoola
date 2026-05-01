import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/fee-slips?schoolId=xxx&classId=xxx&feeItemId=xxx&status=UNPAID
 * Returns fee slips with student + fee item info
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const schoolId = searchParams.get("schoolId")
    const classId = searchParams.get("classId")
    const feeItemId = searchParams.get("feeItemId")
    const status = searchParams.get("status")

    if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })

    const slips = await prisma.feeSlip.findMany({
      where: {
        student: { schoolId, ...(classId ? { classId } : {}) },
        ...(feeItemId ? { feeItemId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            rollNumber: true,
            class: { select: { name: true, section: true } },
            user: { select: { name: true, email: true } },
          },
        },
        feeItem: { select: { id: true, title: true, term: true, academicYear: true } },
      },
      orderBy: [{ student: { user: { name: "asc" } } }],
    })

    return NextResponse.json(slips)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/fee-slips
 * Bulk-assign a fee item to all students in a class (or a single student).
 *
 * Body: { schoolId, feeItemId, classId?, studentId?, dueDate? }
 *
 * Skips students who already have a slip for this fee item.
 */
export async function POST(req: NextRequest) {
  try {
    const { schoolId, feeItemId, classId, studentId, dueDate } = await req.json()

    if (!feeItemId) return NextResponse.json({ error: "feeItemId required" }, { status: 400 })

    // Fetch the fee item to get the amount
    const feeItem = await prisma.feeItem.findUnique({ where: { id: feeItemId } })
    if (!feeItem) return NextResponse.json({ error: "Fee item not found" }, { status: 404 })

    let studentIds: string[] = []

    if (studentId) {
      studentIds = [studentId]
    } else if (classId) {
      const students = await prisma.student.findMany({
        where: { schoolId, classId, isActive: true },
        select: { id: true },
      })
      studentIds = students.map(s => s.id)
    } else {
      return NextResponse.json({ error: "Either classId or studentId is required" }, { status: 400 })
    }

    if (studentIds.length === 0) {
      return NextResponse.json({ created: 0, message: "No active students found" })
    }

    // Find students who already have a slip for this fee item (skip them)
    const existing = await prisma.feeSlip.findMany({
      where: { feeItemId, studentId: { in: studentIds } },
      select: { studentId: true },
    })
    const existingStudentIds = new Set(existing.map(s => s.studentId))

    const toCreate = studentIds
      .filter(id => !existingStudentIds.has(id))
      .map(sid => ({
        studentId: sid,
        feeItemId,
        amount: feeItem.amount,
        paidAmount: 0,
        status: "UNPAID" as const,
        dueDate: dueDate ? new Date(dueDate) : null,
      }))

    if (toCreate.length === 0) {
      return NextResponse.json({ created: 0, skipped: existing.length, message: "All students already have this fee assigned" })
    }

    await prisma.feeSlip.createMany({ data: toCreate })

    return NextResponse.json({
      created: toCreate.length,
      skipped: existingStudentIds.size,
      message: `Fee assigned to ${toCreate.length} student${toCreate.length !== 1 ? "s" : ""}`,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
