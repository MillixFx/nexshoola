import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const config = await prisma.platformConfig.findFirst()
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const {
    paystackSecretKey, paystackPublicKey, paystackWebhookSecret,
    feePerStudentTermly, platformFeePercent, currency, siteName, supportEmail,
  } = body

  const existing = await prisma.platformConfig.findFirst()

  const data = {
    paystackSecretKey: paystackSecretKey || null,
    paystackPublicKey: paystackPublicKey || null,
    paystackWebhookSecret: paystackWebhookSecret || null,
    feePerStudentTermly: parseFloat(feePerStudentTermly) || 15,
    platformFeePercent: parseFloat(platformFeePercent) || 0,
    currency: currency || "GHS",
    siteName: siteName || "NexSchoola",
    supportEmail: supportEmail || null,
  }

  const config = existing
    ? await prisma.platformConfig.update({ where: { id: existing.id }, data })
    : await prisma.platformConfig.create({ data })

  return NextResponse.json(config)
}
