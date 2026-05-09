/**
 * POST /api/staff-attendance/kiosk        — register a new kiosk device
 * GET  /api/staff-attendance/kiosk        — list kiosk devices for this school
 * DELETE /api/staff-attendance/kiosk?id=  — deactivate a device
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateDeviceToken, hashDeviceToken } from "@/lib/staff-qr"

const KIOSK_PERMISSION = "MANAGE_KIOSK"

async function canManage(session: any) {
  const role = session?.user?.role
  if (role === "ADMIN" || role === "HEADMASTER" || role === "SUPER_ADMIN") return true
  // Delegated permission
  const perm = await prisma.userPermission.findUnique({
    where: {
      schoolId_userId_permission: {
        schoolId: session.user.schoolId,
        userId: session.user.id,
        permission: KIOSK_PERMISSION,
      },
    },
  })
  return !!perm
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await canManage(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const devices = await prisma.kioskDevice.findMany({
    where: { schoolId: session.user.schoolId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, isActive: true, createdAt: true },
  })
  return NextResponse.json(devices)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await canManage(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Device name required" }, { status: 400 })

  const plainToken = generateDeviceToken()
  const tokenHash  = hashDeviceToken(plainToken)

  const device = await prisma.kioskDevice.create({
    data: {
      schoolId:    session.user.schoolId,
      name:        name.trim(),
      tokenHash,
      createdById: session.user.id,
    },
    select: { id: true, name: true, isActive: true, createdAt: true },
  })

  // Return the plain token ONCE — it's never stored in plaintext
  return NextResponse.json({ ...device, deviceToken: plainToken }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await canManage(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await prisma.kioskDevice.updateMany({
    where: { id, schoolId: session.user.schoolId },
    data:  { isActive: false },
  })
  return NextResponse.json({ ok: true })
}
