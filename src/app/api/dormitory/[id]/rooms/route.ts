import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/dormitory/[id]/rooms — rooms with beds + assigned students
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const dorm = await prisma.dormitory.findFirst({ where: { id, schoolId } })
  if (!dorm) return NextResponse.json({ error: "Not found." }, { status: 404 })

  const rooms = await prisma.dormitoryRoom.findMany({
    where: { dormitoryId: id },
    include: {
      beds: {
        include: {
          students: {
            select: { id: true, user: { select: { name: true } } },
            take: 1,
          },
        },
        orderBy: { bedNumber: "asc" },
      },
    },
    orderBy: { roomNumber: "asc" },
  })

  // Normalise: each bed has a single student or null
  const normalised = rooms.map(r => ({
    ...r,
    capacity: r.bedCount,
    beds: r.beds.map(b => ({
      ...b,
      student: b.students[0] ?? null,
    })),
  }))

  return NextResponse.json(normalised)
}

// POST /api/dormitory/[id]/rooms — add a room + auto-create beds
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const dorm = await prisma.dormitory.findFirst({ where: { id, schoolId } })
  if (!dorm) return NextResponse.json({ error: "Not found." }, { status: 404 })

  try {
    const { roomNumber, capacity } = await req.json()
    if (!roomNumber) return NextResponse.json({ error: "Room number is required." }, { status: 400 })
    const beds = Number(capacity) || 4

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.dormitoryRoom.create({
        data: { dormitoryId: id, roomNumber: String(roomNumber), bedCount: beds },
      })
      await tx.dormitoryBed.createMany({
        data: Array.from({ length: beds }, (_, i) => ({
          roomId: created.id,
          bedNumber: String(i + 1),
        })),
      })
      return tx.dormitoryRoom.findUnique({
        where: { id: created.id },
        include: {
          beds: {
            include: {
              students: { select: { id: true, user: { select: { name: true } } }, take: 1 },
            },
            orderBy: { bedNumber: "asc" },
          },
        },
      })
    })

    const normalised = {
      ...room,
      capacity: room!.bedCount,
      beds: room!.beds.map(b => ({ ...b, student: b.students[0] ?? null })),
    }

    return NextResponse.json(normalised, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Room number already exists in this hostel." }, { status: 409 })
    return NextResponse.json({ error: e.message || "Failed." }, { status: 500 })
  }
}
