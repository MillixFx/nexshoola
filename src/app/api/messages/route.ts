import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { schoolId, recipientIds, subject, body } = await req.json()
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
