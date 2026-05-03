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

    // Use a transaction to create issue and decrement stock
    const [issue] = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } })
      if (!item) throw new Error("Item not found")
      if (item.quantity < qty) throw new Error(`Insufficient stock. Available: ${item.quantity}`)

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: { decrement: qty } },
      })

      const issue = await tx.itemIssue.create({
        data: {
          itemId,
          recipientId,
          recipientType,
          quantity: qty,
          status: "UNPAID", // "active" / not yet returned
        },
        include: { item: { select: { name: true, unit: true } } },
      })

      return [issue]
    })

    return NextResponse.json(issue, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
