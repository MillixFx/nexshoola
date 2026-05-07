import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const PERMISSION = "ADMIT_STUDENTS"

// GET /api/admissions-access?schoolId=xxx  → list of users with ADMIT_STUDENTS permission
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const schoolId = session.user.schoolId
  const perms = await prisma.userPermission.findMany({
    where: { schoolId, permission: PERMISSION },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(perms)
}

// POST /api/admissions-access  { userId }  → grant ADMIT_STUDENTS to a user
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "HEADMASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const schoolId = session.user.schoolId
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  // Neon HTTP: upsert + include → findUnique + create/update, then fetch separately
  const whereKey = { schoolId_userId_permission: { schoolId, userId, permission: PERMISSION } }
  const existing = await prisma.userPermission.findUnique({ where: whereKey })
  if (existing) {
    await prisma.userPermission.update({ where: whereKey, data: { grantedBy: session.user.id } })
  } else {
    await prisma.userPermission.create({ data: { schoolId, userId, permission: PERMISSION, grantedBy: session.user.id } })
  }
  const perm = await prisma.userPermission.findUnique({
    where: whereKey,
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })

  return NextResponse.json(perm, { status: 201 })
}

// DELETE /api/admissions-access?userId=xxx  → revoke permission
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "ADMIN" && role !== "HEADMASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const schoolId = session.user.schoolId
  const userId = new URL(req.url).searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  await prisma.userPermission.deleteMany({
    where: { schoolId, userId, permission: PERMISSION },
  })

  return NextResponse.json({ ok: true })
}
