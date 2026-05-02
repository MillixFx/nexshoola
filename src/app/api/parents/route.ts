import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schoolId = session.user.schoolId
  const parents = await prisma.parent.findMany({
    where: { schoolId },
    include: {
      user: { select: { name: true, email: true, phone: true, isActive: true } },
      students: {
        include: { student: { select: { id: true, user: { select: { name: true } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(parents)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schoolId = session.user.schoolId

  try {
    const { name, email, password, phone, occupation, address, relation } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 })
    if (!phone?.trim()) return NextResponse.json({ error: "Phone number is required." }, { status: 400 })

    // Email is optional — generate a unique placeholder if not supplied
    const resolvedEmail = email?.trim()
      || `parent_${phone.trim().replace(/\D/g, "")}_${Date.now()}@noreply.local`

    const hashed = await bcrypt.hash(password || "changeme123", 10)
    const user = await prisma.user.create({
      data: {
        schoolId,
        name: name.trim(),
        email: resolvedEmail,
        password: hashed,
        phone: phone.trim(),
        role: "PARENT",
        parent: {
          create: {
            schoolId,
            occupation: occupation || null,
            address: address || null,
            relation: relation || "Parent",
          },
        },
      },
      include: {
        parent: {
          include: {
            students: {
              include: { student: { select: { id: true, user: { select: { name: true } } } } },
            },
          },
        },
      },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e: any) {
    console.error("Create parent error:", e)
    if (e.code === "P2002") return NextResponse.json({ error: "A user with this email already exists in this school." }, { status: 409 })
    return NextResponse.json({ error: e.message || "Failed to create parent." }, { status: 500 })
  }
}
