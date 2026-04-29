import { PrismaClient } from "@prisma/client"
import { PrismaNeonHttp } from "@prisma/adapter-neon"

// Use Neon HTTP adapter — no WebSocket, works in all environments (Node, Edge, Serverless)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // No DATABASE_URL — return bare client (will error on first query, not at import time)
    return new PrismaClient()
  }
  const adapter = new PrismaNeonHttp(connectionString, {} as any)
  return new PrismaClient({ adapter } as any)
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
