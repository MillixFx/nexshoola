import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET /api/setup — create first school + admin + super admin if none exist
export async function GET() {
  try {
    const results: any = {}

    // ── Create demo school if none exist ──────────────────────────────
    const existing = await prisma.school.findFirst()
    if (!existing) {
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
          email: "admin@demo.com",
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
        },
      })

      results.school = {
        created: true,
        slug: school.slug,
        adminEmail: "admin@demo.com",
        adminPassword: process.env.SEED_ADMIN_PASSWORD ?? "[REDACTED]",
        loginUrl: "/login",
      }
    } else {
      results.school = { created: false, message: "Demo school already exists", slug: existing.slug }
    }

    // ── Create super admin if none exist ──────────────────────────────
    const existingSuperAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } })
    if (!existingSuperAdmin) {
      // Super admin needs a schoolId — attach to first school
      const school = existing ?? await prisma.school.findFirst()
      if (school) {
        const superAdminPw = await bcrypt.hash("super[REDACTED]", 12)
        await prisma.user.create({
          data: {
            schoolId: school.id,
            name: "Platform Owner",
            email: "owner@nexschoola.com",
            password: superAdminPw,
            role: "SUPER_ADMIN",
            isActive: true,
          },
        })
        results.superAdmin = {
          created: true,
          email: "owner@nexschoola.com",
          password: "super[REDACTED]",
          loginUrl: "/login (use Super Admin tab)",
        }
      }
    } else {
      results.superAdmin = { created: false, message: "Super admin already exists" }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
