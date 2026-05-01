import { NextRequest, NextResponse } from "next/server"
import { verifyPayment } from "@/lib/paystack"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference")

  if (!reference) {
    return NextResponse.redirect(new URL("/dashboard/finance?error=missing_reference", req.url))
  }

  try {
    const result = await verifyPayment(reference)

    if (result.status && result.data.status === "success") {
      const { metadata } = result.data
      const { schoolId, userId, type } = metadata

      if (type === "FEE" || type === "SCHOOL_FEE") {
        // School fee payment — record the transaction
        await prisma.feeSlip.updateMany({
          where: { paystackRef: reference },
          data: {
            status: "PAID",
            paidAt: new Date(),
            paidAmount: result.data.amount / 100,
          },
        })
        return NextResponse.redirect(new URL("/dashboard/finance?success=payment_confirmed", req.url))

      } else if (type === "SUBSCRIPTION" || type === "PLATFORM_FEE") {
        // Platform subscription payment — money came to platform owner
        // Update school's subscription status: paid for 90 days (one term)
        const termExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        await prisma.school.update({
          where: { id: schoolId },
          data: {
            subscriptionPaidAt: new Date(),
            subscriptionNotes: `Paid via Paystack — ref: ${reference} — amount: GH₵${(result.data.amount / 100).toFixed(2)}`,
            planExpiry: termExpiry,
            paystackRef: reference,
            // Upgrade to BASIC if still on FREE
            ...(metadata.currentPlan === "FREE" && { plan: "BASIC" }),
          },
        })
        return NextResponse.redirect(new URL("/dashboard/subscription?success=paid", req.url))

      } else if (type === "SALARY") {
        await prisma.salarySlip.updateMany({
          where: { paystackRef: reference },
          data: { status: "PAID", paidAt: new Date() },
        })
        return NextResponse.redirect(new URL("/dashboard/payroll?success=salary_paid", req.url))
      }

      return NextResponse.redirect(new URL("/dashboard?success=payment_confirmed", req.url))
    }

    return NextResponse.redirect(new URL("/dashboard/finance?error=payment_failed", req.url))
  } catch (error) {
    console.error("Paystack verify error:", error)
    return NextResponse.redirect(new URL("/dashboard/finance?error=verification_failed", req.url))
  }
}
