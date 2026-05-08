import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch participants for one or more conversations and return user records.
 * Neon HTTP: completely flat — no nested select/include on relations.
 * Two separate queries joined in JS.
 */
async function fetchParticipantUsers(conversationIds: string[]) {
  if (conversationIds.length === 0) return []
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId: { in: conversationIds } },
    select: { conversationId: true, userId: true, lastReadAt: true },
  })
  const userIds = [...new Set(participants.map(p => p.userId))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, role: true, avatar: true },
  })
  const userMap = new Map(users.map(u => [u.id, u]))
  return participants.map(p => ({
    conversationId: p.conversationId,
    userId: p.userId,
    lastReadAt: p.lastReadAt,
    user: userMap.get(p.userId) ?? null,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/chat/conversations
 * Returns all conversations the current user is a participant in.
 * All Prisma queries are completely flat (no nested include/select) to
 * satisfy Neon's HTTP adapter constraint of no implicit transactions.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  // 1. Base conversation rows — flat, no relations
  const convRows = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, isGroup: true, name: true, updatedAt: true },
  })

  if (convRows.length === 0) return NextResponse.json([])

  const convIds = convRows.map(c => c.id)

  // 2. Participants + users — two flat queries
  const participantRows = await fetchParticipantUsers(convIds)

  // 3. Latest messages — flat query, no nested relation, filter per-conv in JS
  const recentMessages = await prisma.chatMessage.findMany({
    where: { conversationId: { in: convIds }, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, conversationId: true, content: true, createdAt: true, senderId: true },
    take: Math.max(convIds.length * 3, 20),
  })

  // 4. Unread counts — flat count per conversation
  const unreadCounts = await Promise.all(
    convIds.map(async (convId) => {
      const me = participantRows.find(p => p.conversationId === convId && p.userId === userId)
      const count = await prisma.chatMessage.count({
        where: {
          conversationId: convId,
          senderId: { not: userId },
          deletedAt: null,
          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
        },
      })
      return { conversationId: convId, count }
    })
  )
  const unreadMap = new Map(unreadCounts.map(u => [u.conversationId, u.count]))

  // 5. Group participants by conversation in JS
  const participantsByConv = new Map<string, typeof participantRows>()
  for (const p of participantRows) {
    const arr = participantsByConv.get(p.conversationId) ?? []
    arr.push(p)
    participantsByConv.set(p.conversationId, arr)
  }

  // 6. Last message per conversation in JS
  const lastMsgByConv = new Map<string, typeof recentMessages[0]>()
  for (const m of recentMessages) {
    if (!lastMsgByConv.has(m.conversationId)) lastMsgByConv.set(m.conversationId, m)
  }

  const enriched = convRows.map(c => ({
    id: c.id,
    isGroup: c.isGroup,
    name: c.name,
    updatedAt: c.updatedAt,
    participants: (participantsByConv.get(c.id) ?? []).map(p => p.user).filter(Boolean),
    lastMessage: lastMsgByConv.get(c.id) ?? null,
    unreadCount: unreadMap.get(c.id) ?? 0,
  }))

  return NextResponse.json(enriched)
}

/**
 * POST /api/chat/conversations
 * Body: { userIds: string[], name?: string }
 * All queries flat — no nested include/select on relations.
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

  // Verify all target users exist — flat, no school filter so SUPER_ADMIN can chat too
  const otherUsers = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true },
  })
  if (otherUsers.length !== userIds.length) {
    return NextResponse.json({ error: "One or more users not found" }, { status: 403 })
  }

  // For 1:1: find an existing direct conversation by manually intersecting participants.
  // Avoid participants: { some: {...} } in WHERE — that relational filter triggers an
  // implicit transaction on Neon HTTP. Use two flat lookups + JS intersection instead.
  if (userIds.length === 1) {
    const otherId = userIds[0]

    const [myParticipations, otherParticipations] = await Promise.all([
      prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      }),
      prisma.conversationParticipant.findMany({
        where: { userId: otherId },
        select: { conversationId: true },
      }),
    ])

    const myConvIds  = new Set(myParticipations.map(p => p.conversationId))
    const sharedIds  = otherParticipations.map(p => p.conversationId).filter(id => myConvIds.has(id))

    if (sharedIds.length > 0) {
      // Find a non-group conversation among the shared ones — flat WHERE (id in [...])
      const existing = await prisma.conversation.findFirst({
        where: { id: { in: sharedIds }, isGroup: false },
        select: { id: true, name: true },
      })
      if (existing) {
        const parts = await fetchParticipantUsers([existing.id])
        return NextResponse.json({
          id: existing.id,
          isGroup: false,
          name: existing.name,
          participants: parts.map(p => p.user).filter(Boolean),
          unreadCount: 0,
          lastMessage: null,
        })
      }
    }
  }

  const isGroup = userIds.length > 1
  const allParticipantIds = Array.from(new Set([userId, ...userIds]))

  // Create conversation — flat scalar create, no nested write
  let conversationId: string
  try {
    const conv = await prisma.conversation.create({
      data: { schoolId, isGroup, name: isGroup ? name || "Group Chat" : null, createdById: userId },
      select: { id: true },
    })
    conversationId = conv.id
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create conversation" }, { status: 500 })
  }

  // Add participants individually — avoids any createMany implicit transaction edge cases
  for (const pid of allParticipantIds) {
    try {
      await prisma.conversationParticipant.create({
        data: { conversationId, userId: pid },
        select: { id: true },
      })
    } catch {
      // Ignore unique constraint violations (duplicate participant)
    }
  }

  const parts = await fetchParticipantUsers([conversationId])

  return NextResponse.json({
    id: conversationId,
    isGroup,
    name: isGroup ? name || "Group Chat" : null,
    participants: parts.map(p => p.user).filter(Boolean),
    unreadCount: 0,
    lastMessage: null,
  }, { status: 201 })
}
