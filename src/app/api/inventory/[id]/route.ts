import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { name, quantity, unit, unitPrice, supplier } = await req.json()
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name,
        quantity: Number(quantity) || 0,
        unit: unit || null,
        unitPrice: unitPrice ? Number(unitPrice) : null,
        rate: unitPrice ? Number(unitPrice) : 0,
        supplier: supplier || null,
      },
    })
    return NextResponse.json(item)
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.inventoryItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
