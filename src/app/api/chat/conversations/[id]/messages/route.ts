import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function assertParticipant(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
  return !!p
}

/**
 * GET /api/chat/conversations/[id]/messages?since=<iso>
 * Returns messages in the conversation. If `since` is provided, returns only
 * messages newer than that timestamp (used for polling-based live updates).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params
  const userId = session.user.id

  if (!(await assertParticipant(conversationId, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const since = req.nextUrl.searchParams.get("since")

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      deletedAt: null,
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, role: true, avatar: true } },
    },
  })

  return NextResponse.json(messages)
}

/**
 * POST /api/chat/conversations/[id]/messages
 * Body: { content: string }
 * Creates a new message and bumps the conversation's updatedAt.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: conversationId } = await params
  const userId = session.user.id

  if (!(await assertParticipant(conversationId, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { content } = await req.json()
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content required" }, { status: 400 })
  }

  const message = await prisma.chatMessage.create({
    data: { conversationId, senderId: userId, content: content.trim() },
    include: { sender: { select: { id: true, name: true, role: true, avatar: true } } },
  })

  // Bump conversation updatedAt for sorting + mark sender's lastReadAt
  // Neon HTTP adapter does not support $transaction — run sequentially
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  })

  return NextResponse.json(message, { status: 201 })
}
