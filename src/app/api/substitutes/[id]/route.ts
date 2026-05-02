import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/substitutes/[id]  — extend/shorten end date
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { endDate, note } = body

  try {
    const sub = await prisma.classSubstitute.update({
      where: { id },
      data: {
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(note !== undefined ? { note } : {}),
      },
      include: {
        substitute: { select: { id: true, user: { select: { name: true } } } },
        class: { select: { id: true, name: true, section: true } },
      },
    })
    return NextResponse.json(sub)
  } catch {
    return NextResponse.json({ error: "Failed to update substitute." }, { status: 500 })
  }
}

// DELETE /api/substitutes/[id]  — deactivate (end the substitution now)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    await prisma.classSubstitute.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to remove substitute." }, { status: 500 })
  }
}
