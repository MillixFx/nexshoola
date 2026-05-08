import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { schoolName, slug, adminName, email, password, country, currency } = await req.json()

    if (!schoolName || !slug || !adminName || !email || !password) {
      return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 })
    }

    // Validate slug: lowercase alphanumeric + hyphens only, 3–30 chars
    const slugRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Subdomain must be 3–30 characters, lowercase letters, numbers, and hyphens only." },
        { status: 400 }
      )
    }

    // Block reserved slugs that clash with platform routes or could be misleading
    const RESERVED = [
      "api", "www", "mail", "smtp", "admin", "login", "register", "dashboard",
      "super-admin", "superadmin", "nexschoola", "support", "billing", "help",
      "status", "app", "auth", "static", "cdn", "assets", "images",
    ]
    if (RESERVED.includes(slug)) {
      return NextResponse.json({ error: "That subdomain name is reserved. Please choose another." }, { status: 400 })
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
