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
    if (!phone?.trim()) return NextResponse.json({ error: "Phone number is required." }, { status: 400 })
    // Email is optional — generate a unique placeholder if not supplied
    const resolvedEmail = email?.trim()
      || `parent_${phone.trim().replace(/\D/g, "")}_${Date.now()}@noreply.local`
    const hashed = await bcrypt.hash(password || "changeme123", 10)
    const user = await prisma.user.create({
      data: {
        schoolId, name, email: resolvedEmail, password: hashed,
        phone: phone.trim(), role: "PARENT",
        parent: { create: { schoolId, occupation: occupation || null, address: address || null, relation: relation || "Parent" } },
      },
      include: { parent: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "A parent with this email already exists." }, { status: 409 })
    return NextResponse.json({ error: "Failed to create parent." }, { status: 500 })
  }
}
