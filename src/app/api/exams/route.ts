import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })
  const exams = await prisma.exam.findMany({
    where: { schoolId },
    include: {
      routines: {
        include: { subject: { select: { title: true } }, class: { select: { name: true, section: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(exams)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { schoolId, title, term, academicYear, startDate, endDate } = body
    const exam = await prisma.exam.create({
      data: {
        schoolId, title,
        term: term || null,
        academicYear: academicYear || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })
    return NextResponse.json(exam, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 })
  }
}
