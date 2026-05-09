/**
 * POST /api/staff-attendance/check-in
 *
 * Called by the kiosk page when a QR code is scanned.
 * Public endpoint — authenticated by device token, not user session.
 *
 * Body: { qrPayload: "userId:sig", deviceToken: "plain_device_token" }
 * Returns: { name, role, status, checkInTime, alreadyRecorded }
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  verifyStaffQrPayload,
  generateSchoolQrSecret,
  hashDeviceToken,
  resolveAttendanceStatus,
} from "@/lib/staff-qr"
import { sendNotification } from "@/lib/sms"

export async function POST(req: NextRequest) {
  try {
    const { qrPayload, deviceToken } = await req.json()
    if (!qrPayload || !deviceToken) {
      return NextResponse.json({ error: "Missing qrPayload or deviceToken" }, { status: 400 })
    }

    // 1. Verify kiosk device
    const tokenHash = hashDeviceToken(deviceToken)
    const kiosk = await prisma.kioskDevice.findUnique({
      where: { tokenHash },
      include: { school: { select: { id: true, name: true, staffLateAfter: true, staffQrSecret: true } } },
    })
    if (!kiosk || !kiosk.isActive) {
      return NextResponse.json({ error: "Device not registered or inactive" }, { status: 403 })
    }

    const school = kiosk.school

    // 2. Ensure school has a QR secret (generate lazily on first use)
    let qrSecret = school.staffQrSecret
    if (!qrSecret) {
      qrSecret = generateSchoolQrSecret()
      await prisma.school.update({ where: { id: school.id }, data: { staffQrSecret: qrSecret } })
    }

    // 3. Verify the employee QR payload
    const result = verifyStaffQrPayload(qrPayload, qrSecret)
    if (!result.valid) {
      return NextResponse.json({ error: "Invalid QR code" }, { status: 400 })
    }

    // 4. Load the staff member
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: {
        id: true, name: true, role: true, schoolId: true, phone: true,
        teacher: { select: { id: true } },
        employee: { select: { id: true } },
      },
    })
    if (!user || user.schoolId !== school.id) {
      return NextResponse.json({ error: "Staff member not found at this school" }, { status: 404 })
    }
    const staffType = user.teacher ? "TEACHER" : "EMPLOYEE"

    // 5. Check if already recorded today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await prisma.staffAttendance.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    })
    if (existing) {
      return NextResponse.json({
        alreadyRecorded: true,
        name: user.name,
        status: existing.status,
        checkInTime: existing.checkInTime,
      })
    }

    // 6. Determine PRESENT vs LATE
    const now = new Date()
    const status = resolveAttendanceStatus(school.staffLateAfter ?? "08:00", now)

    // 7. Record attendance
    const record = await prisma.staffAttendance.create({
      data: {
        schoolId:    school.id,
        userId:      user.id,
        staffType,
        date:        today,
        checkInTime: now,
        status,
        kioskId:     kiosk.id,
      },
    })

    return NextResponse.json({
      alreadyRecorded: false,
      name: user.name,
      role: user.role,
      status: record.status,
      checkInTime: record.checkInTime,
    })
  } catch (err: any) {
    console.error("Check-in error:", err)
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 })
  }
}
