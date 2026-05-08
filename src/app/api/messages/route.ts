import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { schoolId, recipientIds, subject, body } = await req.json()

    // Ensure the caller belongs to the school they're messaging within
    if (session.user.role !== "SUPER_ADMIN" && session.user.schoolId !== schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    // Use first admin as sender for now
    const sender = await prisma.user.findFirst({ where: { schoolId, role: "ADMIN" } })
    if (!sender) return NextResponse.json({ error: "No sender found" }, { status: 400 })

    const message = await prisma.message.create({
      data: {
        schoolId,
        senderId: sender.id,
        subject,
        body,
        recipients: {
          create: (recipientIds as string[]).map((userId: string) => ({ userId })),
        },
      },
    })
    return NextResponse.json(message, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
