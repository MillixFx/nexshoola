import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const books = await prisma.book.findMany({ where: { schoolId }, orderBy: { title: "asc" } })
  return NextResponse.json(books)
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, title, author, isbn, category, quantity, shelfNo } = await req.json()
    const book = await prisma.book.create({ data: { schoolId, title, author, isbn, category, quantity: Number(quantity) || 1, availableQty: Number(quantity) || 1, shelfNo } })
    return NextResponse.json(book, { status: 201 })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
