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

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, content: true, createdAt: true, senderId: true },
      },
    },
  })

  // Compute unread count for each conversation
  const enriched = await Promise.all(
    conversations.map(async (c) => {
      const me = c.participants.find((p) => p.userId === userId)
      const unreadCount = me?.lastReadAt
        ? await prisma.chatMessage.count({
            where: {
              conversationId: c.id,
              createdAt: { gt: me.lastReadAt },
              senderId: { not: userId },
              deletedAt: null,
            },
          })
        : await prisma.chatMessage.count({
            where: { conversationId: c.id, senderId: { not: userId }, deletedAt: null },
          })

      return {
        id: c.id,
        isGroup: c.isGroup,
        name: c.name,
        updatedAt: c.updatedAt,
        participants: c.participants.map((p) => p.user),
        lastMessage: c.messages[0] ?? null,
        unreadCount,
      }
    })
  )

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
    const existing = await prisma.conversation.findFirst({
      where: {
        schoolId,
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherId } } },
        ],
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } } },
      },
    })
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        isGroup: false,
        name: existing.name,
        participants: existing.participants.map((p) => p.user),
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

  // Fetch the completed conversation with participants
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } } },
    },
  })

  return NextResponse.json({
    id: conversationId,
    isGroup,
    name: conversation?.name ?? null,
    participants: conversation?.participants.map((p) => p.user) ?? [],
    unreadCount: 0,
    lastMessage: null,
  }, { status: 201 })
}
