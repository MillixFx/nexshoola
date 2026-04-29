import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const notices = await prisma.notice.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } })
  return NextResponse.json(notices)
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, title, content, audience, priority, expiresAt } = await req.json()
    const notice = await prisma.notice.create({
      data: { schoolId, title, content, audience: audience || "ALL", priority: priority || "NORMAL", expiresAt: expiresAt ? new Date(expiresAt) : null },
    })
    return NextResponse.json(notice, { status: 201 })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
