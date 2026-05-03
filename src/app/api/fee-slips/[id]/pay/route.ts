import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { initializePayment, generateReference } from "@/lib/paystack"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const slipId = params.id
    const userId = session.user.id
    const schoolId = session.user.schoolId

    // Find the student linked to this user
    const student = await prisma.student.findUnique({ where: { userId } })
    if (!student) return NextResponse.json({ error: "Student profile not found" }, { status: 404 })

    // Get the fee slip and verify it belongs to this student
    const slip = await prisma.feeSlip.findUnique({
      where: { id: slipId },
      include: { feeItem: { select: { title: true } } },
    })

    if (!slip) return NextResponse.json({ error: "Fee slip not found" }, { status: 404 })
    if (slip.studentId !== student.id) return NextResponse.json({ error: "Access denied" }, { status: 403 })
    if (slip.status === "PAID") return NextResponse.json({ error: "Fee is already paid" }, { status: 400 })

    const outstanding = slip.amount - slip.paidAmount
    if (outstanding <= 0) return NextResponse.json({ error: "No outstanding balance" }, { status: 400 })

    // Look up school subaccount
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { paystackSubaccountCode: true },
    })

    const reference = generateReference("FEE_PAYMENT")

    // Stamp the slip with the reference so webhook can locate it
    await prisma.feeSlip.update({
      where: { id: slipId },
      data: { paystackRef: reference },
    })

    const result = await initializePayment({
      email: session.user.email!,
      amount: Math.round(outstanding * 100), // kobo
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify?reference=${reference}`,
      metadata: {
        feeSlipId: slip.id,
        schoolId,
        studentId: student.id,
        type: "FEE_PAYMENT",
        description: slip.feeItem.title,
        userId,
      },
      ...(school?.paystackSubaccountCode && {
        subaccount: school.paystackSubaccountCode,
        bearer: "subaccount" as const,
      }),
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Fee pay init error:", error)
    return NextResponse.json({ error: error.message ?? "Payment initialization failed" }, { status: 500 })
  }
}
