import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET  /api/library/issues  — all active issues for this school
export async function GET() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const issues = await prisma.bookIssue.findMany({
    where: { book: { schoolId } },
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
    orderBy: { issueDate: "desc" },
  })

  return NextResponse.json(issues)
}

// POST /api/library/issues  — issue a book to a user
export async function POST(req: NextRequest) {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { bookId, userId, dueDate } = await req.json()
    if (!bookId || !userId || !dueDate) {
      return NextResponse.json({ error: "bookId, userId and dueDate are required." }, { status: 400 })
    }

    // Verify book belongs to this school and has copies available
    const book = await prisma.book.findFirst({ where: { id: bookId, schoolId } })
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 })
    if (book.available <= 0) return NextResponse.json({ error: "No copies available." }, { status: 400 })

    // Verify user belongs to this school
    const user = await prisma.user.findFirst({ where: { id: userId, schoolId } })
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 })

    // Get or create LibraryMember
    const member = await prisma.libraryMember.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })

    // Check user doesn't already have this book
    const existing = await prisma.bookIssue.findFirst({
      where: { bookId, memberId: member.id, status: "ISSUED" },
    })
    if (existing) return NextResponse.json({ error: "This person already has a copy of this book." }, { status: 409 })

    // Neon HTTP adapter does not support $transaction — run sequentially
    const created = await prisma.bookIssue.create({
      data: {
        bookId,
        memberId: member.id,
        dueDate: new Date(dueDate),
        status: "ISSUED",
      },
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

    await prisma.book.update({ where: { id: bookId }, data: { available: { decrement: 1 } } })

    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    console.error("Issue book error:", e)
    return NextResponse.json({ error: e.message || "Failed to issue book." }, { status: 500 })
  }
}
