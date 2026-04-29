import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { schoolId, userId, title, content, isAnonymous } = await req.json()
    const suggestion = await prisma.suggestion.create({
      data: { schoolId, userId: isAnonymous ? null : userId, title, content, isAnonymous: !!isAnonymous },
      include: { user: { select: { name: true, role: true } } },
    })
    return NextResponse.json(suggestion, { status: 201 })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
