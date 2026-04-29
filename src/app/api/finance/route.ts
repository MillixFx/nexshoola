import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/finance?schoolId=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })

  const [transactions, feeItems] = await Promise.all([
    prisma.transaction.findMany({
      where: { schoolId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        feeItem: { select: { title: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.feeItem.findMany({
      where: { schoolId },
      include: { class: { select: { name: true, section: true } } },
      orderBy: { title: "asc" },
    }),
  ])

  return NextResponse.json({ transactions, feeItems })
}

// POST /api/finance — create fee item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, schoolId, title, amount, classId, term, academicYear } = body

    if (type === "fee_item") {
      const item = await prisma.feeItem.create({
        data: { schoolId, title, amount: Number(amount), classId: classId || null, term, academicYear },
        include: { class: { select: { name: true, section: true } } },
      })
      return NextResponse.json(item, { status: 201 })
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
