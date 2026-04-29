import { PrismaClient } from "@prisma/client"
import { Pool, neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"

// Required for Node.js runtime (not Edge) — Neon uses WebSocket under the hood
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // No database URL — return a standard client that will error on first query
    // (happens during `next build` type-checking pass)
    return new PrismaClient()
  }
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter } as any)
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
