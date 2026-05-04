import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/parents/search?q=
// Search parents by name, phone, or email within the authenticated user's school
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const schoolId = session.user.schoolId
  const q = req.nextUrl.searchParams.get("q") ?? ""

  try {
    const parents = await prisma.parent.findMany({
      where: {
        schoolId,
        ...(q.trim()
          ? {
              OR: [
                { user: { name: { contains: q, mode: "insensitive" } } },
                { user: { email: { contains: q, mode: "insensitive" } } },
                { user: { phone: { contains: q } } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        relation: true,
        occupation: true,
        phone: true,
        user: { select: { name: true, email: true, phone: true } },
      },
      take: 15,
      orderBy: { user: { name: "asc" } },
    })

    return NextResponse.json(parents)
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
