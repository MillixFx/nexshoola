import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"

const employeeSelect = {
  id: true, employeeId: true, role: true, department: true,
  gender: true, address: true, photo: true, joiningDate: true, isActive: true,
  user: { select: { name: true, email: true, phone: true, isActive: true, role: true } },
} as const

const STAFF_ROLES = ["ADMIN", "HEADMASTER", "ACCOUNTANT", "LIBRARIAN", "HOSTEL_MANAGER", "HR", "DRIVER"]

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schoolId = session.user.schoolId
  const allowed = ["ADMIN", "HEADMASTER", "HR"]
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const employees = await prisma.employee.findMany({
    where: { schoolId },
    select: employeeSelect,
    orderBy: { joiningDate: "desc" },
  })
  return NextResponse.json(employees)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schoolId = session.user.schoolId
  const allowed = ["ADMIN", "HEADMASTER", "HR"]
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { name, email, phone, employeeId, role, department, gender, address, joiningDate } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 })

    const userRole = STAFF_ROLES.includes(role) ? role : "ADMIN"
    const resolvedEmail = email?.trim() || `emp_${(employeeId || Date.now())}@noreply.local`
    const hashed = await bcrypt.hash("changeme123", 10)

    // Neon HTTP: nested create + include → sequential creates then findUnique
    const createdUser = await prisma.user.create({
      data: {
        schoolId,
        name: name.trim(),
        email: resolvedEmail,
        password: hashed,
        phone: phone?.trim() || null,
        role: userRole,
      },
    })
    const createdEmployee = await prisma.employee.create({
      data: {
        schoolId,
        userId: createdUser.id,
        employeeId: employeeId?.trim() || null,
        role: role || null,
        department: department?.trim() || null,
        gender: gender || null,
        address: address?.trim() || null,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      },
    })
    const employee = await prisma.employee.findUnique({
      where: { id: createdEmployee.id },
      select: employeeSelect,
    })
    return NextResponse.json(employee, { status: 201 })
  } catch (e: any) {
    console.error("Create employee error:", e)
    if (e.code === "P2002") return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 })
    return NextResponse.json({ error: e.message || "Failed to create employee." }, { status: 500 })
  }
}
