import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const leaveInclude = { user: { select: { name: true, role: true } } } as const

export async function POST(req: NextRequest) {
  try {
    const { schoolId, userId, leaveType, startDate, endDate, reason } = await req.json()
    const created = await prisma.leaveApplication.create({
      data: { schoolId, userId, leaveType, startDate: new Date(startDate), endDate: new Date(endDate), reason, status: "PENDING" },
    })
    const app = await prisma.leaveApplication.findUnique({ where: { id: created.id }, include: leaveInclude })
    return NextResponse.json(app, { status: 201 })
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, status } = await req.json()
    await prisma.leaveApplication.update({ where: { id }, data: { status } })
    const app = await prisma.leaveApplication.findUnique({ where: { id }, include: leaveInclude })
    return NextResponse.json(app)
  } catch (e) { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
