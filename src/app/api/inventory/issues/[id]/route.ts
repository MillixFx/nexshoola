import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT: return an issued item (increment quantity, mark as returned/PAID)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const issueId = params.id

    const updated = await prisma.$transaction(async (tx) => {
      const issue = await tx.itemIssue.findUnique({ where: { id: issueId } })
      if (!issue) throw new Error("Issue record not found")
      if (issue.status === "PAID") throw new Error("Item already returned")

      // Increment stock
      await tx.inventoryItem.update({
        where: { id: issue.itemId },
        data: { quantity: { increment: issue.quantity } },
      })

      // Mark as returned (using PAID as the "returned" status per schema)
      const updated = await tx.itemIssue.update({
        where: { id: issueId },
        data: { status: "PAID" },
        include: { item: { select: { name: true, unit: true } } },
      })

      return updated
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
