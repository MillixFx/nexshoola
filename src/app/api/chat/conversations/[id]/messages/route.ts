import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function assertParticipant(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
  return !!p
}

// Attach sender data to messages — completely flat (no nested include/select)
async function attachSenders(messages: { id: string; conversationId: string; senderId: string; content: string; createdAt: Date; deletedAt: Date | null }[]) {
  if (messages.length === 0) return []
  const senderIds = [...new Set(messages.map(m => m.senderId))]
  const senders = await prisma.user.findMany({
    where: { id: { in: senderIds } },
    select: { id: true, name: true, role: true, avatar: true },
  })
  const senderMap = new Map(senders.map(s => [s.id, s]))
  return messages.map(m => ({ ...m, sender: senderMap.get(m.senderId) ?? null }))
}

/**
 * GET /api/chat/conversations/[id]/messages
 * All queries flat — no nested include/select on relations (Neon HTTP constraint).
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
    select: { id: true, conversationId: true, senderId: true, content: true, createdAt: true, deletedAt: true },
  })

  const enriched = await attachSenders(messages)
  return NextResponse.json(enriched)
}

/**
 * POST /api/chat/conversations/[id]/messages
 * All queries flat — no nested include/select on relations (Neon HTTP constraint).
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

  // Create message — flat, no include
  const created = await prisma.chatMessage.create({
    data: { conversationId, senderId: userId, content: content.trim() },
    select: { id: true, conversationId: true, senderId: true, content: true, createdAt: true, deletedAt: true },
  })

  // Bump conversation updatedAt + mark sender read — sequential flat updates
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  })

  // Attach sender data — flat
  const [enriched] = await attachSenders([created])
  return NextResponse.json(enriched ?? created, { status: 201 })
}
