import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: { _count: { select: { students: true } } },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(classes)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { schoolId, name, section, code, capacity } = body
    const cls = await prisma.class.create({
      data: { schoolId, name, section, code, capacity: capacity ? Number(capacity) : null },
      include: { _count: { select: { students: true } } },
    })
    return NextResponse.json(cls, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Class already exists." }, { status: 409 })
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}
