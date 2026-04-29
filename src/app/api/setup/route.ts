import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET /api/setup — create first school + admin if none exist
export async function GET() {
  try {
    const existing = await prisma.school.findFirst()
    if (existing) {
      return NextResponse.json({
        ok: false,
        message: "Setup already complete. A school already exists.",
        school: { name: existing.name, slug: existing.slug },
      })
    }

    const school = await prisma.school.create({
      data: {
        name: "NexSchoola Demo",
        slug: "demo",
        country: "GH",
        currency: "GHS",
        timezone: "Africa/Accra",
        plan: "PRO",
        isActive: true,
      },
    })

    const hashedPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "[REDACTED]", 12)
    await prisma.user.create({
      data: {
        schoolId: school.id,
        name: "School Admin",
        email: "admin@nexschoola.com",
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
    })

    return NextResponse.json({
      ok: true,
      message: "Setup complete! You can now log in.",
      credentials: {
        schoolSlug: "demo",
        email: "admin@nexschoola.com",
        password: process.env.SEED_ADMIN_PASSWORD ?? "[REDACTED]",
        loginUrl: "/login",
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
