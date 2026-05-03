import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/** GET /api/promotion?classId=xxx  — promotion history for students in a class */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schoolId = session.user.schoolId
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get("classId")

  const promotions = await prisma.promotion.findMany({
    where: {
      student: { schoolId },
      ...(classId ? { fromClassId: classId } : {}),
    },
    include: {
      student: { select: { user: { select: { name: true } }, rollNumber: true } },
      fromClass: { select: { name: true, section: true } },
    },
    orderBy: { promotedAt: "desc" },
    take: 100,
  })

  // Fetch toClass names separately since schema has no toClass relation
  const toClassIds = [...new Set(promotions.map(p => p.toClassId))]
  const toClasses = await prisma.class.findMany({
    where: { id: { in: toClassIds } },
    select: { id: true, name: true, section: true },
  })
  const toClassMap = Object.fromEntries(toClasses.map(c => [c.id, c]))

  return NextResponse.json(promotions.map(p => ({
    id: p.id,
    promotedAt: p.promotedAt,
    note: p.note,
    student: { name: p.student.user.name, rollNumber: p.student.rollNumber },
    fromClass: p.fromClass,
    toClass: toClassMap[p.toClassId] ?? { name: "Unknown", section: null },
  })))
}

/** POST /api/promotion — bulk promote students */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const allowed = ["ADMIN", "HEADMASTER"]
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Only Admin or Headmaster can promote students." }, { status: 403 })
  }

  const { promotions, note } = await req.json() as {
    promotions: { studentId: string; fromClassId: string; toClassId: string }[]
    note?: string
  }

  if (!Array.isArray(promotions) || promotions.length === 0) {
    return NextResponse.json({ error: "No students selected." }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create promotion records
      await tx.promotion.createMany({
        data: promotions.map(p => ({
          studentId: p.studentId,
          fromClassId: p.fromClassId,
          toClassId: p.toClassId,
          note: note || null,
        })),
      })

      // Update each student's classId
      for (const p of promotions) {
        await tx.student.update({
          where: { id: p.studentId },
          data: { classId: p.toClassId },
        })
      }

      return promotions.length
    })

    return NextResponse.json({ promoted: result })
  } catch (e: any) {
    console.error("Promotion error:", e)
    return NextResponse.json({ error: e.message || "Failed to promote students." }, { status: 500 })
  }
}
