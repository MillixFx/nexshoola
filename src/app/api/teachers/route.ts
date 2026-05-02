import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// Staff roles an admin is allowed to assign (excludes STUDENT, PARENT, SUPER_ADMIN)
const ALLOWED_STAFF_ROLES = new Set([
  "ADMIN", "HEADMASTER", "TEACHER", "ACCOUNTANT",
  "LIBRARIAN", "HOSTEL_MANAGER", "HR", "DRIVER",
])

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get("schoolId")
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })

  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    select: {
      id: true, teacherId: true, employeeId: true, qualification: true,
      designation: true, department: true, gender: true, photo: true,
      joiningDate: true, isActive: true,
      user: { select: { name: true, email: true, phone: true, isActive: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(teachers)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      schoolId, name, email, password, phone,
      teacherId, qualification, designation, department,
      joiningDate, gender, address, photo,
      role = "TEACHER",
    } = body

    const resolvedRole = ALLOWED_STAFF_ROLES.has(role) ? role : "TEACHER"
    const hashed = await bcrypt.hash(password || "changeme123", 10)

    const user = await prisma.user.create({
      data: {
        schoolId, name, email, password: hashed, phone,
        role: resolvedRole,
        teacher: {
          create: {
            schoolId, teacherId, qualification, designation, department,
            joiningDate: joiningDate ? new Date(joiningDate) : undefined,
            gender, address,
            photo: photo || null,
          },
        },
      },
      include: { teacher: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Email already exists." }, { status: 409 })
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 })
  }
}
