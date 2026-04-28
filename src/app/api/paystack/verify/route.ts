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

      // Handle different payment types
      if (type === "FEE") {
        await prisma.feeSlip.updateMany({
          where: { paystackRef: reference },
          data: {
            status: "PAID",
            paidAt: new Date(),
            paidAmount: result.data.amount / 100,
          },
        })
      } else if (type === "SUBSCRIPTION") {
        // Update school plan
        await prisma.school.update({
          where: { id: schoolId },
          data: {
            paystackRef: reference,
            plan: metadata.plan ?? "BASIC",
            planExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days (1 term)
          },
        })
      } else if (type === "SALARY") {
        await prisma.salarySlip.updateMany({
          where: { paystackRef: reference },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        })
      }

      return NextResponse.redirect(new URL("/dashboard/finance?success=payment_confirmed", req.url))
    }

    return NextResponse.redirect(new URL("/dashboard/finance?error=payment_failed", req.url))
  } catch (error) {
    console.error("Paystack verify error:", error)
    return NextResponse.redirect(new URL("/dashboard/finance?error=verification_failed", req.url))
  }
}
