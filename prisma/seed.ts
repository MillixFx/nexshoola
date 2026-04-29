import { readFileSync } from "fs"
import { resolve } from "path"

// Manually parse .env.local before anything else runs
function loadEnv() {
  const files = [".env.local", ".env"]
  for (const file of files) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eq = trimmed.indexOf("=")
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = val
      }
    } catch { /* file not found — skip */ }
  }
}
loadEnv()

import { Pool, neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import ws from "ws"

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set")

  console.log("🔌 Connecting to database...")
  neonConfig.webSocketConstructor = ws
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)
  const prisma = new PrismaClient({ adapter } as any)

  console.log("🌱 Seeding database...")

  const existing = await prisma.school.findFirst()
  if (existing) {
    console.log(`✅ School already exists: "${existing.name}" (slug: ${existing.slug})`)
    console.log("   Skipping seed. Delete existing records to re-seed.")
    await prisma.$disconnect()
    await pool.end()
    return
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
  console.log(`✅ School created: "${school.name}"`)

  const hashedPassword = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: "School Admin",
      email: "admin@nexschoola.com",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
  })
  console.log(`✅ Admin user created: ${admin.email}`)

  await prisma.$disconnect()
  await pool.end()

  console.log("\n🎉 Seed complete!")
  console.log("─────────────────────────────────")
  console.log("  School slug : demo")
  console.log("  Email       : admin@nexschoola.com")
  console.log("  Password    : admin123")
  console.log("─────────────────────────────────")
}

main().catch((e) => { console.error(e); process.exit(1) })
