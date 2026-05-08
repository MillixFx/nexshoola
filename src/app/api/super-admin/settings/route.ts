import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const config = await prisma.platformConfig.findFirst()
  if (!config) return NextResponse.json(null)

  // Never return raw secret keys to the browser — send masked placeholders instead
  // The frontend uses these only to show "key is set" status, not the actual value
  return NextResponse.json({
    ...config,
    paystackSecretKey:    config.paystackSecretKey    ? "sk_••••••••••••••••" : null,
    paystackWebhookSecret: config.paystackWebhookSecret ? "whsk_••••••••••••••••" : null,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const {
    paystackSecretKey, paystackPublicKey, paystackWebhookSecret,
    feePerStudentTermly, platformFeePercent, currency, siteName, supportEmail, supportPhone,
    planPriceBasic, planPricePro, planPriceEnterprise,
  } = body

  const existing = await prisma.platformConfig.findFirst()

  // If the client sends back our masked placeholder, keep the existing real value
  const isMaskedSecret  = (v: string | null | undefined) => v?.startsWith("sk_••") || v?.startsWith("whsk_••")
  const isMaskedWebhook = (v: string | null | undefined) => v?.startsWith("whsk_••")

  const data = {
    paystackSecretKey:    isMaskedSecret(paystackSecretKey)   ? existing?.paystackSecretKey    ?? null : (paystackSecretKey    || null),
    paystackPublicKey:    paystackPublicKey    || null,
    paystackWebhookSecret: isMaskedWebhook(paystackWebhookSecret) ? existing?.paystackWebhookSecret ?? null : (paystackWebhookSecret || null),
    feePerStudentTermly:  parseFloat(feePerStudentTermly)  || 15,
    platformFeePercent:   parseFloat(platformFeePercent)   || 0,
    currency:             currency             || "GHS",
    siteName:             siteName             || "NexSchoola",
    supportEmail:         supportEmail         || null,
    supportPhone:         supportPhone         || null,
    planPriceBasic:       parseFloat(planPriceBasic)       || 500,
    planPricePro:         parseFloat(planPricePro)         || 1200,
    planPriceEnterprise:  parseFloat(planPriceEnterprise)  || 2500,
  }

  const config = existing
    ? await prisma.platformConfig.update({ where: { id: existing.id }, data })
    : await prisma.platformConfig.create({ data })

  return NextResponse.json(config)
}
