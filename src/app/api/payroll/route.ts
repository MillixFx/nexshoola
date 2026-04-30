import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })

  const payslips = await prisma.staffPayslip.findMany({
    where: { schoolId },
    include: { teacher: { include: { user: { select: { name: true } } } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })
  return NextResponse.json(payslips)
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, teacherId, month, year, basicSalary, allowances, deductions, notes } = await req.json()

    const totalAllowances = (allowances as { name: string; amount: number }[]).reduce((s, a) => s + a.amount, 0)
    const totalDeductions = (deductions as { name: string; amount: number }[]).reduce((s, d) => s + d.amount, 0)
    const netPay = Number(basicSalary) + totalAllowances - totalDeductions

    const payslip = await prisma.staffPayslip.create({
      data: {
        schoolId,
        teacherId,
        month: Number(month),
        year: Number(year),
        basicSalary: Number(basicSalary),
        allowances: allowances ?? [],
        deductions: deductions ?? [],
        netPay,
        notes: notes || null,
        status: "DRAFT",
      },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    })
    return NextResponse.json(payslip, { status: 201 })
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Payslip already exists for this teacher/month/year" }, { status: 409 })
    return NextResponse.json({ error: "Failed to create payslip" }, { status: 500 })
  }
}
