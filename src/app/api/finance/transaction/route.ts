import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
        reference: reference || null,
        note: note || null,
        status: "COMPLETED",
      },
    })
    return NextResponse.json(transaction, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
