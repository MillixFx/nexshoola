import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/chat/conversations
 * Returns all conversations the current user is a participant in,
 * with the latest message preview and unread count.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  // Neon HTTP: deep nested includes (with orderBy/take on a nested relation) trigger
  // an implicit transaction. Split into 3 flat queries and join in JS.
  const convRows = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, isGroup: true, name: true, updatedAt: true },
  })

  if (convRows.length === 0) return NextResponse.json([])

  const convIds = convRows.map(c => c.id)

  // Flat participant query (one level of include)
  const [participantRows, recentMessages] = await Promise.all([
    prisma.conversationParticipant.findMany({
      where: { conversationId: { in: convIds } },
      select: {
        conversationId: true,
        userId: true,
        lastReadAt: true,
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
    }),
    // Fetch recent messages for all convs and slice per-conv in JS
    prisma.chatMessage.findMany({
      where: { conversationId: { in: convIds }, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, conversationId: true, content: true, createdAt: true, senderId: true },
      take: convIds.length * 2, // at least 1 per conv
    }),
  ])

  // Unread counts — one count query per conv is fine (already separate HTTP calls)
  const unreadCounts = await Promise.all(
    convRows.map(async (c) => {
      const me = participantRows.find(p => p.conversationId === c.id && p.userId === userId)
      const count = await prisma.chatMessage.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          deletedAt: null,
          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
        },
      })
      return { conversationId: c.id, count }
    })
  )
  const unreadMap = new Map(unreadCounts.map(u => [u.conversationId, u.count]))

  // Group by conversation in JS
  const participantsByConv = new Map<string, typeof participantRows>()
  for (const p of participantRows) {
    const arr = participantsByConv.get(p.conversationId) ?? []
    arr.push(p)
    participantsByConv.set(p.conversationId, arr)
  }

  const lastMsgByConv = new Map<string, typeof recentMessages[0]>()
  for (const m of recentMessages) {
    if (!lastMsgByConv.has(m.conversationId)) lastMsgByConv.set(m.conversationId, m)
  }

  const enriched = convRows.map(c => ({
    id: c.id,
    isGroup: c.isGroup,
    name: c.name,
    updatedAt: c.updatedAt,
    participants: (participantsByConv.get(c.id) ?? []).map(p => p.user),
    lastMessage: lastMsgByConv.get(c.id) ?? null,
    unreadCount: unreadMap.get(c.id) ?? 0,
  }))

  return NextResponse.json(enriched)
}

/**
 * POST /api/chat/conversations
 * Body: { userIds: string[], name?: string }
 *
 * For 1:1 chats (single userId): if a 1:1 conversation already exists between
 * the two users, returns it instead of creating a duplicate.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const schoolId = session.user.schoolId
  const { userIds, name } = await req.json()

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "userIds required" }, { status: 400 })
  }

  // Verify all participants are in the same school
  const otherUsers = await prisma.user.findMany({
    where: { id: { in: userIds }, schoolId },
    select: { id: true },
  })
  if (otherUsers.length !== userIds.length) {
    return NextResponse.json({ error: "Some users are not in your school" }, { status: 403 })
  }

  // For 1:1, look for an existing direct conversation
  if (userIds.length === 1) {
    const otherId = userIds[0]
    // Neon HTTP: avoid include on findFirst — use select for flat data then fetch participants separately
    const existing = await prisma.conversation.findFirst({
      where: {
        schoolId,
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherId } } },
        ],
      },
      select: { id: true, name: true },
    })
    if (existing) {
      const parts = await prisma.conversationParticipant.findMany({
        where: { conversationId: existing.id },
        select: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } },
      })
      return NextResponse.json({
        id: existing.id,
        isGroup: false,
        name: existing.name,
        participants: parts.map(p => p.user),
        unreadCount: 0,
        lastMessage: null,
      })
    }
  }

  const isGroup = userIds.length > 1
  const allParticipantIds = Array.from(new Set([userId, ...userIds]))

  // Neon HTTP adapter does not support implicit nested-write transactions.
  // Create conversation first, then participants separately.
  let conversationId: string
  try {
    const conv = await prisma.conversation.create({
      data: {
        schoolId,
        isGroup,
        name: isGroup ? name || "Group Chat" : null,
        createdById: userId,
      },
    })
    conversationId = conv.id
  } catch (e: any) {
    console.error("Failed to create conversation:", e)
    return NextResponse.json({ error: e.message || "Failed to create conversation" }, { status: 500 })
  }

  // Add all participants
  try {
    await prisma.conversationParticipant.createMany({
      data: allParticipantIds.map((pid) => ({ conversationId, userId: pid })),
      skipDuplicates: true,
    })
  } catch (e: any) {
    // Clean up orphaned conversation
    await prisma.conversation.delete({ where: { id: conversationId } }).catch(() => {})
    console.error("Failed to add participants:", e)
    return NextResponse.json({ error: e.message || "Failed to add participants" }, { status: 500 })
  }

  // Fetch participants separately (Neon HTTP: avoid deep nested include)
  const convName = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { name: true },
  })
  const parts = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } },
  })

  return NextResponse.json({
    id: conversationId,
    isGroup,
    name: convName?.name ?? null,
    participants: parts.map(p => p.user),
    unreadCount: 0,
    lastMessage: null,
  }, { status: 201 })
}
