import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await prisma.exam.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { title, term, academicYear, startDate, endDate } = await req.json()
  try {
    const exam = await prisma.exam.update({
      where: { id },
      data: {
        title,
        term: term || null,
        academicYear: academicYear || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })
    return NextResponse.json(exam)
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
