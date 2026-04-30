import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createSubaccount } from "@/lib/paystack"

// POST /api/super-admin/schools/[id]/subaccount
// Auto-creates a Paystack subaccount for the school using stored bank details
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  const school = await prisma.school.findUnique({ where: { id } })
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })

  if (!school.paystackBankCode || !school.paystackAccountNumber || !school.paystackBusinessName) {
    return NextResponse.json({ error: "Bank code, account number and business name are required first" }, { status: 400 })
  }

  try {
    const result = await createSubaccount({
      business_name: school.paystackBusinessName,
      settlement_bank: school.paystackBankCode,
      account_number: school.paystackAccountNumber,
      percentage_charge: 0, // 0% — school keeps all fee money
      description: `${school.name} student fees subaccount`,
    })

    if (!result.status) {
      return NextResponse.json({ error: result.message ?? "Paystack subaccount creation failed" }, { status: 400 })
    }

    const subaccountCode = result.data.subaccount_code

    // Save the code
    const updated = await prisma.school.update({
      where: { id },
      data: {
        paystackSubaccountCode: subaccountCode,
        paystackAccountName: result.data.account_name ?? school.paystackAccountName,
      },
    })

    return NextResponse.json({ ok: true, subaccountCode, school: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Failed to create subaccount" }, { status: 500 })
  }
}
