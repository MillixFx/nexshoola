import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const events = await prisma.calendarEvent.findMany({ where: { schoolId }, orderBy: { startDate: "asc" } })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, title, description, startDate, endDate, type, color } = await req.json()
    const event = await prisma.calendarEvent.create({
      data: {
        schoolId,
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        type: type || null,
        color: color || null,
      },
    })
    return NextResponse.json(event, { status: 201 })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.calendarEvent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
