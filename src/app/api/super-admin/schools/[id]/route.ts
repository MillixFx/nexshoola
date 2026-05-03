import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const {
    plan, isActive, subscriptionPaidAt, subscriptionNotes, planExpiry,
    paystackSubaccountCode, paystackBankCode, paystackAccountNumber,
    paystackAccountName, paystackBusinessName,
  } = body

  const data: Record<string, any> = {}
  if (plan !== undefined) data.plan = plan
  if (isActive !== undefined) data.isActive = isActive
  if (subscriptionPaidAt !== undefined) data.subscriptionPaidAt = subscriptionPaidAt ? new Date(subscriptionPaidAt) : null
  if (planExpiry !== undefined) data.planExpiry = planExpiry ? new Date(planExpiry) : null
  if (subscriptionNotes !== undefined) data.subscriptionNotes = subscriptionNotes || null
  if (paystackSubaccountCode !== undefined) data.paystackSubaccountCode = paystackSubaccountCode || null
  if (paystackBankCode !== undefined) data.paystackBankCode = paystackBankCode || null
  if (paystackAccountNumber !== undefined) data.paystackAccountNumber = paystackAccountNumber || null
  if (paystackAccountName !== undefined) data.paystackAccountName = paystackAccountName || null
  if (paystackBusinessName !== undefined) data.paystackBusinessName = paystackBusinessName || null

  try {
    const school = await prisma.school.update({ where: { id }, data })
    return NextResponse.json(school)
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  try {
    await prisma.school.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to delete" }, { status: 500 })
  }
}
