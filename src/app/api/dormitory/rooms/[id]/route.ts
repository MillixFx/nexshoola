import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// DELETE /api/dormitory/rooms/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    // Verify room belongs to a dorm in this school
    const room = await prisma.dormitoryRoom.findFirst({
      where: { id, dormitory: { schoolId } },
    })
    if (!room) return NextResponse.json({ error: "Not found." }, { status: 404 })

    await prisma.dormitoryRoom.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed." }, { status: 500 })
  }
}
