import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * DELETE /api/chat/conversations/[id]
 * Deletes the entire conversation (DB cascade removes messages & participants).
 * Only participants OR SUPER_ADMIN can delete.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const userId = session.user.id
  const isSuperAdmin = session.user.role === "SUPER_ADMIN"

  if (!isSuperAdmin) {
    // Verify the caller is a participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: id, userId },
      select: { id: true },
    })
    if (!participant) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Delete messages first (avoids implicit transaction on Neon HTTP adapter)
  await prisma.chatMessage.deleteMany({ where: { conversationId: id } })
  await prisma.conversationParticipant.deleteMany({ where: { conversationId: id } })
  await prisma.conversation.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
