import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const subInclude = {
  substitute: { select: { id: true, user: { select: { name: true } } } },
  assignedBy: { select: { id: true, name: true, role: true } },
  class: { select: { id: true, name: true, section: true } },
} as const

// GET /api/substitutes?schoolId=&classId=&date=YYYY-MM-DD
// Returns active substitutes. With date → only those covering that date.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  const classId  = searchParams.get("classId")
  const dateStr  = searchParams.get("date")

  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })

  const where: any = { schoolId, isActive: true }
  if (classId) where.classId = classId
  if (dateStr) {
    const date = new Date(dateStr)
    where.startDate = { lte: date }
    where.OR = [{ endDate: null }, { endDate: { gte: date } }]
  }

  const subs = await prisma.classSubstitute.findMany({
    where,
    include: subInclude,
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(subs)
}

// POST /api/substitutes
// Body: { classId, substituteId, startDate, endDate?, note? }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { classId, substituteId, startDate, endDate, note } = body

    if (!classId || !substituteId || !startDate) {
      return NextResponse.json({ error: "classId, substituteId, and startDate are required." }, { status: 400 })
    }

    // Verify class belongs to this school
    const cls = await prisma.class.findUnique({ where: { id: classId } })
    if (!cls || cls.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 })
    }

    // Verify substitute teacher belongs to this school
    const teacher = await prisma.teacher.findUnique({ where: { id: substituteId } })
    if (!teacher || teacher.schoolId !== session.user.schoolId) {
      return NextResponse.json({ error: "Teacher not found." }, { status: 404 })
    }

    // Deactivate any existing open-ended substitutions for this class
    // Using findMany + individual updates to avoid updateMany transaction issues on Neon HTTP
    const existing = await prisma.classSubstitute.findMany({
      where: { classId, isActive: true, endDate: null },
      select: { id: true },
    })
    for (const s of existing) {
      await prisma.classSubstitute.update({
        where: { id: s.id },
        data: { isActive: false },
      })
    }

    const sub = await prisma.classSubstitute.create({
      data: {
        schoolId: session.user.schoolId,
        classId,
        substituteId,
        assignedById: session.user.id,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        note: note || null,
      },
      include: subInclude,
    })
    return NextResponse.json(sub, { status: 201 })
  } catch (e: any) {
    console.error("Assign substitute error:", e)
    return NextResponse.json({ error: e.message || "Failed to assign substitute." }, { status: 500 })
  }
}
