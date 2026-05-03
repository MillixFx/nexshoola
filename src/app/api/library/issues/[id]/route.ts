import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// PUT /api/library/issues/[id]  — return a book
export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params

    const issue = await prisma.bookIssue.findFirst({
      where: { id, book: { schoolId } },
    })
    if (!issue) return NextResponse.json({ error: "Issue not found." }, { status: 404 })
    if (issue.status === "RETURNED") return NextResponse.json({ error: "Already returned." }, { status: 400 })

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.bookIssue.update({
        where: { id },
        data: { status: "RETURNED", returnDate: new Date() },
        include: {
          book: { select: { id: true, title: true, author: true, isbn: true } },
          member: {
            select: {
              id: true,
              memberId: true,
              user: { select: { id: true, name: true, role: true } },
            },
          },
        },
      })
      await tx.book.update({ where: { id: issue.bookId }, data: { available: { increment: 1 } } })
      return result
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to return book." }, { status: 500 })
  }
}
