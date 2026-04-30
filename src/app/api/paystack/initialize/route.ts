import { NextRequest, NextResponse } from "next/server"
import { initializePayment, generateReference } from "@/lib/paystack"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { amount, type, metadata } = await req.json()

    if (!amount || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const schoolId = session.user.schoolId
    const reference = generateReference(type.toUpperCase())

    // Look up school's Paystack subaccount for direct payouts
    let subaccount: string | undefined
    let platformConfig = null

    if (schoolId) {
      const [school, config] = await Promise.all([
        prisma.school.findUnique({ where: { id: schoolId }, select: { paystackSubaccountCode: true } }),
        prisma.platformConfig.findFirst({ select: { platformFeePercent: true, paystackSecretKey: true } }),
      ])
      subaccount = school?.paystackSubaccountCode ?? undefined
      platformConfig = config
    }

    // Calculate platform fee (in pesewas)
    const feePercent = platformConfig?.platformFeePercent ?? 0
    const transaction_charge = feePercent > 0 ? Math.round(amount * (feePercent / 100)) : undefined

    const result = await initializePayment({
      email: session.user.email!,
      amount, // already in pesewas from client
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify?reference=${reference}`,
      metadata: {
        schoolId,
        userId: session.user.id,
        type,
        ...metadata,
      },
      // If school has a subaccount, route money there; platform keeps transaction_charge
      ...(subaccount && { subaccount, bearer: "subaccount" as const }),
      ...(transaction_charge && { transaction_charge }),
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Paystack init error:", error)
    return NextResponse.json({ error: error.message ?? "Payment initialization failed" }, { status: 500 })
  }
}
