import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.notice.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
