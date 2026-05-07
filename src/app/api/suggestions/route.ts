import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const suggestions = await prisma.suggestion.findMany({
    where: { schoolId },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(suggestions)
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, userId, subject, body, isAnonymous } = await req.json()
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
    const { id, status } = await req.json()
    const suggestion = await prisma.suggestion.update({ where: { id }, data: { status } })
    return NextResponse.json(suggestion)
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
