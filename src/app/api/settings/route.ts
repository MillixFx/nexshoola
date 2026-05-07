import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const {
      id, name, slug, address, phone, email, headmaster,
      country, currency, timezone, startYear,
      logo, currentAcademicYear, currentTerm,
    } = body

    const school = await prisma.school.update({
      where: { id: id || session.user.schoolId },
      data: {
        name,
        slug,
        address: address || null,
        phone: phone || null,
        email: email || null,
        headmaster: headmaster || null,
        country,
        currency,
        timezone,
        startYear: startYear ? Number(startYear) : null,
        logo: logo || null,
        currentAcademicYear: currentAcademicYear || null,
        currentTerm: currentTerm || null,
      },
    })
    return NextResponse.json(school)
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Slug already taken." }, { status: 409 })
    console.error("Settings update error:", e)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
