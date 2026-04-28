import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // During build time DATABASE_URL may not exist — return a stub
  if (!process.env.DATABASE_URL) {
    return new Proxy({} as PrismaClient, {
      get(_target, prop) {
        if (prop === "then") return undefined // not a Promise
        return () => {
          throw new Error(
            "DATABASE_URL is not set. Please configure your Neon PostgreSQL connection string."
          )
        }
      },
    })
  }

  // Runtime: use Neon serverless adapter
  const { neonConfig, Pool } = require("@neondatabase/serverless")
  const { PrismaNeon } = require("@prisma/adapter-neon")
  const ws = require("ws")
  neonConfig.webSocketConstructor = ws

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaNeon(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  } as any)
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
