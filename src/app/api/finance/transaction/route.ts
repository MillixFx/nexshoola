import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { schoolId, studentId, feeItemId, slipId, amount, method, reference, note } = body

    const paid = Number(amount)

    // Run in a transaction so the slip update and the ledger entry are atomic
    const [transaction, updatedSlip] = await prisma.$transaction(async (tx) => {
      // 1. Create the ledger transaction
      const txRecord = await tx.transaction.create({
        data: {
          schoolId,
          studentId: studentId || null,
          feeItemId: feeItemId || null,
          amount: paid,
          type: "INCOME",
          method: method || "CASH",
          reference: reference || null,
          note: note || null,
          status: "COMPLETED",
        },
      })

      // 2. Update the fee slip (find by slipId first, else by studentId+feeItemId)
      let slip = slipId
        ? await tx.feeSlip.findUnique({ where: { id: slipId } })
        : studentId && feeItemId
          ? await tx.feeSlip.findFirst({ where: { studentId, feeItemId } })
          : null

      let slipRecord = null
      if (slip) {
        const newPaid   = slip.paidAmount + paid
        const newStatus =
          newPaid >= slip.amount ? "PAID"
          : newPaid > 0         ? "PARTIAL"
          :                       "UNPAID"

        slipRecord = await tx.feeSlip.update({
          where: { id: slip.id },
          data: {
            paidAmount: newPaid,
            status:     newStatus as any,
            paidAt:     newStatus === "PAID" ? new Date() : slip.paidAt,
          },
        })
      }

      return [txRecord, slipRecord]
    })

    return NextResponse.json({ transaction, slip: updatedSlip }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
