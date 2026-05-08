import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // Only ADMIN / HEADMASTER / SUPER_ADMIN can read suggestions
  const role = session.user.role
  if (role !== "ADMIN" && role !== "HEADMASTER" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })

  // Non-super-admins can only read their own school's suggestions
  if (role !== "SUPER_ADMIN" && session.user.schoolId !== schoolId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const suggestions = await prisma.suggestion.findMany({
    where: { schoolId },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(suggestions)
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { schoolId, userId, subject, body, isAnonymous } = await req.json()

    // Users can only submit suggestions to their own school
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId !== schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Neon HTTP: create + include → create then findUnique
    const created = await prisma.suggestion.create({
      data: {
        schoolId,
        userId: isAnonymous ? null : (userId || null),
        subject,
        body,
        isAnon: !!isAnonymous,
        status: "PENDING",
      },
    })
    const suggestion = await prisma.suggestion.findUnique({
      where: { id: created.id },
      include: { user: { select: { name: true, role: true } } },
    })
    return NextResponse.json(suggestion, { status: 201 })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // Only ADMIN / HEADMASTER / SUPER_ADMIN can update suggestion status
    const role = session.user.role
    if (role !== "ADMIN" && role !== "HEADMASTER" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id, status } = await req.json()
    const suggestion = await prisma.suggestion.update({ where: { id }, data: { status } })
    return NextResponse.json(suggestion)
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
