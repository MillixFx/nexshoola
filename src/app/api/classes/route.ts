import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const classInclude = {
  _count: { select: { students: true } },
  classTeacher: {
    select: { id: true, user: { select: { name: true } } },
  },
} as const

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: classInclude,
    orderBy: { name: "asc" },
  })
  return NextResponse.json(classes)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { schoolId, name, section, code, capacity } = body
    const created = await prisma.class.create({
      data: { schoolId, name, section, code, capacity: capacity ? Number(capacity) : null },
    })
    const cls = await prisma.class.findUnique({ where: { id: created.id }, include: classInclude })
    return NextResponse.json(cls, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Class already exists." }, { status: 409 })
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}
