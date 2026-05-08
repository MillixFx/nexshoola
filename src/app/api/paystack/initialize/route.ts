import { NextRequest, NextResponse } from "next/server"
import { initializePayment, generateReference } from "@/lib/paystack"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Payment routing rules:
 *
 *  type = "SCHOOL_FEE" | "FEE"
 *    → money goes to SCHOOL's Paystack subaccount (school keeps 100%)
 *    → platform takes nothing from these payments
 *
 *  type = "SUBSCRIPTION" | "PLATFORM_FEE"
 *    → money goes DIRECTLY to platform owner (no subaccount)
 *    → this is the 15 GHS/student/term platform fee
 *    → platform keeps 100%, school pays us to use NexSchoola
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { amount, type, metadata } = await req.json()

    if (!amount || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const schoolId = session.user.schoolId
    const userId = session.user.id
    const reference = generateReference(type.toUpperCase())

    // Determine if this is a platform subscription payment or a school fee payment
    const isSubscriptionPayment = ["SUBSCRIPTION", "PLATFORM_FEE"].includes(type.toUpperCase())

    // For school fee payments only: look up school's Paystack subaccount
    let subaccount: string | undefined = undefined

    if (!isSubscriptionPayment && schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { paystackSubaccountCode: true },
      })
      subaccount = school?.paystackSubaccountCode ?? undefined
    }

    // For fee payments: stamp the FeeSlip with this reference so webhook can find it
    if (!isSubscriptionPayment && metadata?.feeSlipId) {
      await prisma.feeSlip.update({
        where: { id: metadata.feeSlipId },
        data: { paystackRef: reference, status: "UNPAID" },
      }).catch(() => {}) // non-blocking — don't fail the whole request
    }

    const result = await initializePayment({
      email: session.user.email!,
      amount, // already in pesewas from client
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify?reference=${reference}`,
      metadata: {
        schoolId,
        userId,
        type,
        ...metadata,
      },
      // School fee payments → route to school's subaccount (school keeps 100%)
      // Subscription payments → no subaccount (goes directly to platform owner)
      ...(!isSubscriptionPayment && subaccount && {
        subaccount,
        bearer: "subaccount" as const,
        // Platform takes 0% cut from school fees — school keeps everything
      }),
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Paystack init error:", error)
    return NextResponse.json({ error: error.message ?? "Payment initialization failed" }, { status: 500 })
  }
}
