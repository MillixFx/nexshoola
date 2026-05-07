import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const dorms = await prisma.dormitory.findMany({
    where: { schoolId },
    include: { _count: { select: { rooms: true } } },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(dorms)
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, name, type, capacity, warden } = await req.json()
    const created = await prisma.dormitory.create({
      data: { schoolId, name, type, capacity: Number(capacity) || 0, warden: warden || null },
    })
    const dorm = await prisma.dormitory.findUnique({ where: { id: created.id }, include: { _count: { select: { rooms: true } } } })
    return NextResponse.json(dorm, { status: 201 })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
