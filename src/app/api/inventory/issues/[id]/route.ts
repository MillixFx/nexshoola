import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT: return an issued item (increment quantity, mark as returned/PAID)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id: issueId } = await params

    // Neon HTTP adapter does not support $transaction — run sequentially
    const issue = await prisma.itemIssue.findUnique({ where: { id: issueId } })
    if (!issue) return NextResponse.json({ error: "Issue record not found" }, { status: 404 })
    if (issue.status === "PAID") return NextResponse.json({ error: "Item already returned" }, { status: 400 })

    // Increment stock
    await prisma.inventoryItem.update({
      where: { id: issue.itemId },
      data: { quantity: { increment: issue.quantity } },
    })

    // Mark as returned (using PAID as the "returned" status per schema)
    await prisma.itemIssue.update({ where: { id: issueId }, data: { status: "PAID" } })
    const updated = await prisma.itemIssue.findUnique({
      where: { id: issueId },
      include: { item: { select: { name: true, unit: true } } },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
