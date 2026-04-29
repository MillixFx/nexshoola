import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST /api/finance/transaction — record a payment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { schoolId, studentId, feeItemId, amount, method, reference, note } = body

    const transaction = await prisma.transaction.create({
      data: {
        schoolId,
        studentId: studentId || null,
        feeItemId: feeItemId || null,
        amount: Number(amount),
        type: "INCOME",
        method: method || "CASH",
        reference,
        note,
        status: "COMPLETED",
      },
      include: {
        student: { include: { user: { select: { name: true } } } },
        feeItem: { select: { title: true, amount: true } },
      },
    })
    return NextResponse.json(transaction, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
