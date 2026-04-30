import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { schoolName, slug, adminName, email, password, country, currency } = await req.json()

    if (!schoolName || !slug || !adminName || !email || !password) {
      return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 })
    }

    // Check slug uniqueness
    const existing = await prisma.school.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "That subdomain is already taken. Please choose another." }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    // Create school + admin in a transaction
    const school = await prisma.school.create({
      data: {
        name: schoolName,
        slug,
        country: country ?? "GH",
        currency: currency ?? "GHS",
        timezone: "Africa/Accra",
        plan: "FREE",
        isActive: true,
        users: {
          create: {
            name: adminName,
            email,
            password: hashed,
            role: "ADMIN",
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json({ ok: true, slug: school.slug }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Registration failed" }, { status: 500 })
  }
}
