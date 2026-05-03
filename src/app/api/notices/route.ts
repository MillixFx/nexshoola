import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schoolId = session.user.schoolId
  const notices = await prisma.notice.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(notices)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schoolId = session.user.schoolId
  const allowed = ["ADMIN", "HEADMASTER", "TEACHER"]
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const { title, content, audience, priority, expiresAt } = await req.json()
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 })
    }
    const notice = await prisma.notice.create({
      data: {
        schoolId,
        title: title.trim(),
        content: content.trim(),
        audience: audience || "ALL",
        priority: priority || "NORMAL",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        postedBy: session.user.name ?? "Admin",
      },
    })
    return NextResponse.json(notice, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to post notice." }, { status: 500 })
  }
}
