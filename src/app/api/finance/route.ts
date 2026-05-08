import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })

  // Non-super-admins can only query their own school's finances
  if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId !== schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [transactions, feeItems] = await Promise.all([
    prisma.transaction.findMany({
      where: { schoolId },
      orderBy: { date: "desc" },
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

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const role = session.user.role
    if (role !== "ADMIN" && role !== "HEADMASTER" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { type, schoolId, title, amount, classId, term, academicYear } = body

    // Ensure the school being modified belongs to the caller
    if (role !== "SUPER_ADMIN" && session.user.schoolId !== schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (type === "fee_item") {
      const created = await prisma.feeItem.create({
        data: { schoolId, title, amount: Number(amount), classId: classId || null, term: term || null, academicYear: academicYear || null },
      })
      const item = await prisma.feeItem.findUnique({ where: { id: created.id }, include: { class: { select: { name: true, section: true } } } })
      return NextResponse.json(item, { status: 201 })
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
