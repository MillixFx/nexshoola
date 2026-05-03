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
        // Platform subscription payment — yearly flat fee
        // Extend from current expiry if still active, otherwise from now
        const currentSchool = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { planExpiry: true },
        })
        const baseDate =
          currentSchool?.planExpiry && currentSchool.planExpiry > new Date()
            ? currentSchool.planExpiry
            : new Date()
        const yearExpiry = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000)

        // Determine which plan was purchased (default to BASIC if not specified)
        const VALID_PLANS = ["BASIC", "PRO", "ENTERPRISE"]
        const purchasedPlan = VALID_PLANS.includes(metadata.selectedPlan)
          ? metadata.selectedPlan
          : "BASIC"

        await prisma.school.update({
          where: { id: schoolId },
          data: {
            subscriptionPaidAt: new Date(),
            subscriptionNotes: `${purchasedPlan} plan (yearly) — ref: ${reference} — GH₵${(result.data.amount / 100).toFixed(2)}`,
            planExpiry: yearExpiry,
            paystackRef: reference,
            plan: purchasedPlan as any,
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
