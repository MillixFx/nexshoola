/**
 * GET /api/staff-attendance/my-qr
 * Returns the QR-code data URL for the currently logged-in staff member.
 * Any authenticated school user can call this — no admin role required.
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { makeStaffQrPayload, generateSchoolQrSecret } from "@/lib/staff-qr"
import QRCode from "qrcode"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: userId, name, schoolId } = session.user as any

  // Ensure the school has a QR secret (lazy-create)
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { staffQrSecret: true, name: true },
  })
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 })

  let qrSecret = school.staffQrSecret
  if (!qrSecret) {
    qrSecret = generateSchoolQrSecret()
    await prisma.school.update({ where: { id: schoolId }, data: { staffQrSecret: qrSecret } })
  }

  const payload  = makeStaffQrPayload(userId, qrSecret)
  const dataUrl  = await QRCode.toDataURL(payload, { width: 260, margin: 2, color: { dark: "#1e1b4b", light: "#ffffff" } })

  return NextResponse.json({ name, schoolName: school.name, qrDataUrl: dataUrl })
}
