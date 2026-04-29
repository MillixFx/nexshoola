// Plain ESM seed — no TypeScript, no adapter, reads .env.local directly
// Run with: node prisma/seed.mjs
import { readFileSync } from "fs"
import { createRequire } from "module"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

// ── 1. Load .env.local ───────────────────────────────────────────
function loadEnv() {
  const files = [".env.local", ".env"]
  for (const f of files) {
    try {
      const lines = readFileSync(resolve(root, f), "utf-8").split("\n")
      for (const line of lines) {
        const t = line.trim()
        if (!t || t.startsWith("#")) continue
        const i = t.indexOf("=")
        if (i < 0) continue
        const k = t.slice(0, i).trim()
        const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "")
        if (k && !process.env[k]) process.env[k] = v
      }
    } catch { /* file not present */ }
  }
}
loadEnv()

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error("❌ DATABASE_URL not set"); process.exit(1) }

// ── 2. Run raw SQL via Neon HTTP API ─────────────────────────────
// Parse connection string to get Neon API endpoint
// Format: postgresql://user:pass@host/db?...
const url = new URL(DATABASE_URL)
const neonApiUrl = `https://${url.hostname}/sql`
const authHeader = "Basic " + Buffer.from(`${url.username}:${url.password}`).toString("base64")

async function sql(query, params = []) {
  const res = await fetch(neonApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader, "Neon-Connection-String": DATABASE_URL },
    body: JSON.stringify({ query, params }),
  })
  if (!res.ok) throw new Error(`SQL error: ${await res.text()}`)
  return res.json()
}

// ── 3. Use pg module directly if Neon HTTP doesn't work ──────────
// Actually let's just use @neondatabase/serverless neon() HTTP function
const require = createRequire(import.meta.url)
const { neon } = require("@neondatabase/serverless")
const { hash } = require("bcryptjs")

const db = neon(DATABASE_URL)

async function main() {
  console.log("🌱 Seeding database...")
  console.log(`   DB host: ${url.hostname}`)

  // Check if school exists
  const existing = await db`SELECT id, name, slug FROM schools LIMIT 1`

  if (existing.length > 0) {
    const s = existing[0]
    console.log(`✅ School already exists: "${s.name}" (slug: ${s.slug})`)
    console.log("   Skipping seed.")
    return
  }

  // Create school
  const schoolId = `c${Date.now()}${Math.random().toString(36).slice(2, 9)}`
  await db`
    INSERT INTO schools (id, name, slug, country, currency, timezone, plan, "isActive", "createdAt", "updatedAt", language)
    VALUES (${schoolId}, 'NexSchoola Demo', 'demo', 'GH', 'GHS', 'Africa/Accra', 'PRO', true, NOW(), NOW(), 'en')
  `
  console.log(`✅ School created (id: ${schoolId})`)

  // Hash password
  const hashedPassword = await hash("[REDACTED]", 12)
  const userId = `c${Date.now() + 1}${Math.random().toString(36).slice(2, 9)}`

  await db`
    INSERT INTO users (id, "schoolId", name, email, password, role, "isActive", "createdAt", "updatedAt")
    VALUES (${userId}, ${schoolId}, 'School Admin', 'admin@nexschoola.com', ${hashedPassword}, 'ADMIN', true, NOW(), NOW())
  `
  console.log(`✅ Admin created: admin@nexschoola.com`)

  console.log("\n🎉 Seed complete!")
  console.log("─────────────────────────────────")
  console.log("  School slug : demo")
  console.log("  Email       : admin@nexschoola.com")
  console.log("  Password    : [REDACTED]")
  console.log("─────────────────────────────────")
  console.log("  Login at http://localhost:3000/login")
}

main().catch(e => { console.error(e); process.exit(1) })
