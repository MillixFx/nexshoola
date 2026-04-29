import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const items = await prisma.inventoryItem.findMany({ where: { schoolId }, orderBy: { name: "asc" } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, name, quantity, unit, unitPrice, supplier } = await req.json()
    const item = await prisma.inventoryItem.create({
      data: {
        schoolId, name,
        quantity: Number(quantity) || 0,
        unit: unit || null,
        unitPrice: unitPrice ? Number(unitPrice) : null,
        rate: unitPrice ? Number(unitPrice) : 0,
        supplier: supplier || null,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
