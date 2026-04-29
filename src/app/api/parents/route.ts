import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const parents = await prisma.parent.findMany({
    where: { schoolId },
    include: {
      user: { select: { name: true, email: true, phone: true, isActive: true } },
      students: { include: { student: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(parents)
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, name, email, password, phone, occupation, address, relation } = await req.json()
    const hashed = await bcrypt.hash(password || "changeme123", 10)
    const user = await prisma.user.create({
      data: {
        schoolId, name, email, password: hashed, phone, role: "PARENT",
        parent: { create: { schoolId, occupation, address, relation } },
      },
      include: { parent: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Email already exists." }, { status: 409 })
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
