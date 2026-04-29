import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const routes = await prisma.transport.findMany({ where: { schoolId }, orderBy: { routeName: "asc" } })
  return NextResponse.json(routes)
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, routeName, vehicleNo, vehicleModel, driverName, driverPhone, capacity, fare } = await req.json()
    const route = await prisma.transport.create({ data: { schoolId, routeName, vehicleNo, vehicleModel, driverName, driverPhone, capacity: Number(capacity) || 0, fare: fare ? Number(fare) : null } })
    return NextResponse.json(route, { status: 201 })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
