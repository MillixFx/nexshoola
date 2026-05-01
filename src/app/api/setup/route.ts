import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET /api/setup — create first school + admin + super admin if none exist
// Passwords are read from env vars: SEED_ADMIN_PASSWORD, SEED_SUPER_ADMIN_PASSWORD
// Defaults to randomly generated values printed only in server logs (never in response)
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

      const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.com"
      const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? generatePassword()
      const hashedPassword = await bcrypt.hash(adminPassword, 12)

      await prisma.user.create({
        data: {
          schoolId: school.id,
          name: "School Admin",
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
          isActive: true,
        },
      })

      // Log credentials to server console only (never returned in response)
      console.log("✅ Demo school created")
      console.log(`   Admin email    : ${adminEmail}`)
      console.log(`   Admin password : ${adminPassword}`)
      console.log("   (Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars to customise)")

      results.school = {
        created: true,
        slug: school.slug,
        adminEmail,
        loginUrl: "/login",
        note: "Admin password printed in server logs. Set SEED_ADMIN_PASSWORD env var to control it.",
      }
    } else {
      results.school = { created: false, message: "Demo school already exists", slug: existing.slug }
    }

    // ── Create or update super admin ─────────────────────────────────
    const existingSuperAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } })
    const superEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? "owner@nexschoola.com"
    const superPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? generatePassword()
    const superAdminPw = await bcrypt.hash(superPassword, 12)

    if (!existingSuperAdmin) {
      const school = existing ?? await prisma.school.findFirst()
      if (school) {
        await prisma.user.create({
          data: {
            schoolId: school.id,
            name: "Platform Owner",
            email: superEmail,
            password: superAdminPw,
            role: "SUPER_ADMIN",
            isActive: true,
          },
        })
        console.log("✅ Super admin created")
        console.log(`   Super admin email    : ${superEmail}`)
        console.log(`   Super admin password : ${superPassword}`)
        results.superAdmin = {
          created: true,
          email: superEmail,
          loginUrl: "/login (use Super Admin tab)",
        }
      }
    } else if (process.env.SEED_SUPER_ADMIN_PASSWORD) {
      // If env var is explicitly set, update the password so you can always reset it via /api/setup
      await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: { password: superAdminPw, email: superEmail },
      })
      console.log("✅ Super admin password updated from SEED_SUPER_ADMIN_PASSWORD env var")
      console.log(`   Super admin email    : ${superEmail}`)
      console.log(`   Super admin password : ${superPassword}`)
      results.superAdmin = {
        updated: true,
        email: superEmail,
        loginUrl: "/login (use Super Admin tab)",
        note: "Password synced from SEED_SUPER_ADMIN_PASSWORD env var.",
      }
    } else {
      results.superAdmin = { created: false, message: "Super admin already exists. Set SEED_SUPER_ADMIN_PASSWORD in .env.local and revisit /api/setup to reset the password." }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

/** Generate a random 16-char alphanumeric password */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}
