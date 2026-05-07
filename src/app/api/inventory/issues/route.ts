import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: list issues for a school
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const schoolId = req.nextUrl.searchParams.get("schoolId") ?? session.user.schoolId

    const issues = await prisma.itemIssue.findMany({
      where: { item: { schoolId } },
      include: { item: { select: { name: true, unit: true } } },
      orderBy: { issueDate: "desc" },
    })

    return NextResponse.json(issues)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: issue an item (decrement quantity)
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { itemId, recipientId, recipientType, quantity } = await req.json()

    if (!itemId || !recipientId || !recipientType || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const qty = Number(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 })
    }

    // Neon HTTP adapter does not support $transaction — run sequentially
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } })
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })
    if (item.quantity < qty) {
      return NextResponse.json({ error: `Insufficient stock. Available: ${item.quantity}` }, { status: 400 })
    }

    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: { decrement: qty } },
    })

    // Neon HTTP: create + include → create then findUnique
    const created = await prisma.itemIssue.create({
      data: {
        itemId,
        recipientId,
        recipientType,
        quantity: qty,
        status: "UNPAID",
      },
    })
    const issue = await prisma.itemIssue.findUnique({
      where: { id: created.id },
      include: { item: { select: { name: true, unit: true } } },
    })

    return NextResponse.json(issue, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
