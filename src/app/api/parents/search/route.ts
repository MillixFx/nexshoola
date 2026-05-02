import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/parents/search?q=&schoolId=
// Search parents by name or email within the school; limit 10 results
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const schoolId = searchParams.get("schoolId")

  if (!schoolId) {
    return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  }

  try {
    const parents = await prisma.parent.findMany({
      where: {
        schoolId,
        OR: [
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        relation: true,
        user: { select: { name: true, email: true, phone: true } },
        students: {
          select: {
            student: { select: { user: { select: { name: true } } } },
          },
        },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(parents)
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
