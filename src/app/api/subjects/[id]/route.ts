import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { title, code, isOptional, group, bookTitle, bookWriter } = body
    const subject = await prisma.subject.update({
      where: { id: params.id },
      data: { title, code, isOptional: !!isOptional, group: group || null, bookTitle, bookWriter },
    })
    return NextResponse.json(subject)
  } catch (e) { return NextResponse.json({ error: "Failed to update" }, { status: 500 }) }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.subject.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: "Failed to delete" }, { status: 500 }) }
}
