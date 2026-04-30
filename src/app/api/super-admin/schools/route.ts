import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const schools = await prisma.school.findMany({
    include: { _count: { select: { students: true, teachers: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(schools)
}
