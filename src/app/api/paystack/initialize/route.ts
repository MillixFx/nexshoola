import { NextRequest, NextResponse } from "next/server"
import { initializePayment, generateReference } from "@/lib/paystack"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { amount, type, metadata } = await req.json()

    if (!amount || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const reference = generateReference(type.toUpperCase())

    const result = await initializePayment({
      email: session.user.email,
      amount,
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify?reference=${reference}`,
      metadata: {
        schoolId: session.user.schoolId,
        userId: session.user.id,
        type,
        ...metadata,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Paystack init error:", error)
    return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 })
  }
}
