import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { basicSalary, allowances, deductions, notes, status } = await req.json()

    const totalAllowances = (allowances as { name: string; amount: number }[]).reduce((s, a) => s + a.amount, 0)
    const totalDeductions = (deductions as { name: string; amount: number }[]).reduce((s, d) => s + d.amount, 0)
    const netPay = Number(basicSalary) + totalAllowances - totalDeductions

    const payslip = await prisma.staffPayslip.update({
      where: { id },
      data: {
        basicSalary: Number(basicSalary),
        allowances: allowances ?? [],
        deductions: deductions ?? [],
        netPay,
        notes: notes || null,
        status: status ?? "DRAFT",
        issuedAt: status === "ISSUED" || status === "PAID" ? new Date() : undefined,
      },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    })
    return NextResponse.json(payslip)
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.staffPayslip.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
