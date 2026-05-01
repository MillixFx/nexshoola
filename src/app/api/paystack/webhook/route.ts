import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendNotification, SmsTemplates } from "@/lib/sms"

/**
 * POST /api/paystack/webhook
 *
 * Paystack calls this endpoint when a payment completes.
 * We verify the HMAC-SHA512 signature, then process the event.
 *
 * This is identical logic to /api/paystack/verify but server-push:
 * - verify route   → handles the customer browser redirect after payment
 * - webhook route  → handles Paystack's async server-to-server notification
 *   (arrives even if the customer closes the tab before being redirected)
 */

// Tell Next.js NOT to parse the body — we need the raw bytes for HMAC
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY ?? ""
    const rawBody = await req.text()
    const paystackSig = req.headers.get("x-paystack-signature") ?? ""

    // ── 1. Verify signature ────────────────────────────────────────
    const expectedSig = createHmac("sha512", secret).update(rawBody).digest("hex")
    if (expectedSig !== paystackSig) {
      console.warn("⚠️  Paystack webhook: invalid signature — possible spoofed request")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // ── 2. Parse event ─────────────────────────────────────────────
    const event = JSON.parse(rawBody)

    // Respond to Paystack immediately — they retry on non-200
    // (we handle the work below, synchronously but quickly)
    if (event.event !== "charge.success") {
      // Other events (refund, dispute, etc.) — ignore for now
      return NextResponse.json({ received: true })
    }

    const { data } = event
    const reference: string = data.reference
    const amountPaid: number = data.amount / 100  // convert from pesewas → GHS
    const metadata = data.metadata ?? {}
    const { schoolId, userId, type, feeSlipId, feeItemId } = metadata

    console.log(`✅ Paystack webhook: charge.success — ref=${reference} type=${type} amount=${amountPaid}`)

    // ── 3. Handle by payment type ──────────────────────────────────

    if (type === "FEE" || type === "SCHOOL_FEE") {
      // ── School fee payment ─────────────────────────────────────
      // Update the fee slip stamped with this reference
      const updatedCount = await prisma.feeSlip.updateMany({
        where: { paystackRef: reference },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paidAmount: amountPaid,
        },
      })

      // If no slip was found by reference, fall back to feeSlipId in metadata
      if (updatedCount.count === 0 && feeSlipId) {
        await prisma.feeSlip.update({
          where: { id: feeSlipId },
          data: { status: "PAID", paidAt: new Date(), paidAmount: amountPaid, paystackRef: reference },
        })
      }

      // Also create a Transaction record for the ledger (skip if already exists for this ref)
      if (schoolId) {
        const existingTx = await prisma.transaction.findFirst({ where: { reference } })
        if (!existingTx) {
          await prisma.transaction.create({
            data: {
              schoolId,
              studentId: metadata.studentId ?? null,
              feeItemId: feeItemId ?? null,
              amount: amountPaid,
              type: "INCOME",
              method: data.channel === "mobile_money" ? "MOBILE_MONEY" : "CARD",
              reference,
              status: "COMPLETED",
              note: `Paystack payment — ${data.channel ?? "online"}`,
            },
          })
        }
      }

      // ── SMS confirmation to parent ─────────────────────────────
      // Best-effort — don't block the webhook on SMS failures
      try {
        const slip = await prisma.feeSlip.findFirst({
          where: { paystackRef: reference },
          include: {
            student: {
              include: {
                user: { select: { name: true } },
                parents: { include: { parent: { include: { user: true } } } },
              },
            },
            feeItem: { select: { term: true } },
          },
        })
        if (slip?.student) {
          const studentName = slip.student.user.name
          const term = slip.feeItem?.term ?? "current term"
          for (const sp of slip.student.parents) {
            const parent = sp.parent.user
            if (parent.phone) {
              const msg = SmsTemplates.paymentConfirmation(parent.name, studentName, amountPaid, term)
              sendNotification({ to: parent.phone, message: msg, channel: "SMS" }).catch(() => {})
            }
          }
        }
      } catch (e) { console.warn("SMS confirmation failed:", e) }

    } else if (type === "SUBSCRIPTION" || type === "PLATFORM_FEE") {
      // ── Platform subscription payment ──────────────────────────
      // Money went to platform owner (no subaccount)
      // Activate school subscription for 90 days (one term)
      if (schoolId) {
        const termExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        await prisma.school.update({
          where: { id: schoolId },
          data: {
            subscriptionPaidAt: new Date(),
            subscriptionNotes: `Paid via Paystack — ref: ${reference} — amount: GH₵${amountPaid.toFixed(2)}`,
            planExpiry: termExpiry,
            paystackRef: reference,
          },
        })
        console.log(`✅ School ${schoolId} subscription renewed until ${termExpiry.toDateString()}`)
      }

    } else if (type === "SALARY") {
      // ── Salary payment ─────────────────────────────────────────
      await prisma.salarySlip.updateMany({
        where: { paystackRef: reference },
        data: { status: "PAID", paidAt: new Date() },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("❌ Paystack webhook error:", error)
    // Still return 200 to stop Paystack from retrying (we log for manual follow-up)
    return NextResponse.json({ received: true })
  }
}
