import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"

const ADMIT_PERMISSION = "ADMIT_STUDENTS"

// GET /api/students?schoolId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const schoolId = searchParams.get("schoolId")
    if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 })

    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        user: { select: { name: true, email: true, phone: true, isActive: true } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { admissionDate: "desc" },
    })

    return NextResponse.json(students)
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
  }
}

// POST /api/students  — requires ADMIN, HEADMASTER, or ADMIT_STUDENTS delegation
export async function POST(req: NextRequest) {
  try {
    // ── Admissions access control ────────────────────────────────────────
    const session = await auth()
    if (session) {
      const role = session.user.role
      const canAdmitByRole = role === "ADMIN" || role === "HEADMASTER"
      if (!canAdmitByRole) {
        // Check delegation
        const schoolId = session.user.schoolId
        const hasPerm = await prisma.userPermission.findUnique({
          where: { schoolId_userId_permission: { schoolId, userId: session.user.id, permission: ADMIT_PERMISSION } },
        })
        if (!hasPerm) {
          return NextResponse.json({ error: "You do not have permission to register students." }, { status: 403 })
        }
      }
    }

    const body = await req.json()
    const {
      schoolId, name, email, password, phone,
      classId, rollNumber, studentId,
      dateOfBirth, gender, address, bloodGroup,
      religion, nationality, photo,
    } = body

    // ── Capacity check before adding student to a class ──────────────────
    if (classId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        select: { capacity: true, name: true, section: true, _count: { select: { students: true } } },
      })
      if (cls?.capacity && cls._count.students >= cls.capacity) {
        const label = `${cls.name}${cls.section ? ` ${cls.section}` : ""}`
        return NextResponse.json(
          { error: `${label} is at full capacity (${cls._count.students}/${cls.capacity}). Please select a different class or increase the capacity.` },
          { status: 409 }
        )
      }
    }

    const hashed = await bcrypt.hash(password || "changeme123", 10)

    const user = await prisma.user.create({
      data: {
        schoolId,
        name,
        email,
        password: hashed,
        phone,
        role: "STUDENT",
        student: {
          create: {
            schoolId,
            classId: classId || null,
            rollNumber,
            studentId,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender,
            address,
            bloodGroup,
            religion,
            nationality,
            photo: photo || null,
          },
        },
      },
      include: { student: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Email already exists for this school." }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 })
  }
}
