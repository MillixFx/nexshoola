import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, slug, address, phone, email, headmaster, country, currency, timezone, startYear } = body
    const school = await prisma.school.update({
      where: { id },
      data: { name, slug, address, phone, email, headmaster, country, currency, timezone, startYear: startYear ? Number(startYear) : null },
    })
    return NextResponse.json(school)
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Slug already taken." }, { status: 409 })
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
