import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { routeName, vehicleNo, vehicleModel, driverName, driverPhone, capacity, fare } = await req.json()
    const route = await prisma.transport.update({
      where: { id },
      data: { routeName, vehicleNo, vehicleModel, driverName, driverPhone, capacity: Number(capacity) || 0, fare: fare ? Number(fare) : null },
    })
    return NextResponse.json(route)
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.transport.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
