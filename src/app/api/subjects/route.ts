import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const subjects = await prisma.subject.findMany({ where: { schoolId }, orderBy: { title: "asc" } })
  return NextResponse.json(subjects)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { schoolId, title, code, isOptional, group, bookTitle, bookWriter } = body
    const subject = await prisma.subject.create({
      data: { schoolId, title, code, isOptional: !!isOptional, group: group || null, bookTitle, bookWriter },
    })
    return NextResponse.json(subject, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Subject already exists." }, { status: 409 })
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 })
  }
}
