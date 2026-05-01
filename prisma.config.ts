import path from "node:path"
import { readFileSync } from "node:fs"
import { defineConfig } from "prisma/config"

// Prisma CLI reads .env by default, but Next.js projects use .env.local
// This loader makes `npx prisma db push / studio / generate` work without
// needing to prefix every command with dotenv flags.
function loadEnvLocal() {
  const files = [".env.local", ".env"]
  for (const f of files) {
    try {
      const content = readFileSync(path.join(process.cwd(), f), "utf-8")
      for (const line of content.split("\n")) {
        const t = line.trim()
        if (!t || t.startsWith("#")) continue
        const i = t.indexOf("=")
        if (i < 0) continue
        const key = t.slice(0, i).trim()
        const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, "")
        if (key && !process.env[key]) process.env[key] = val
      }
    } catch { /* file not present */ }
  }
}

loadEnvLocal()

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
})
