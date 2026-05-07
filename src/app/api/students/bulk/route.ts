import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"

// POST /api/students/bulk
// Body: { rows: Array<{ name, email?, phone?, className?, classId?, rollNumber?, studentId?, gender?, dateOfBirth?, nationality?, address? }> }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role
  const canAdmit = role === "ADMIN" || role === "HEADMASTER"
  if (!canAdmit) {
    const perm = await prisma.userPermission.findUnique({
      where: {
        schoolId_userId_permission: {
          schoolId: session.user.schoolId,
          userId: session.user.id,
          permission: "ADMIT_STUDENTS",
        },
      },
    })
    if (!perm) return NextResponse.json({ error: "Permission denied." }, { status: 403 })
  }

  const schoolId = session.user.schoolId
  const { rows } = await req.json() as {
    rows: {
      name: string
      email?: string
      phone?: string
      className?: string  // looked up by name+section
      classId?: string    // direct id
      rollNumber?: string
      studentId?: string
      gender?: string
      dateOfBirth?: string
      nationality?: string
      address?: string
      religion?: string
      bloodGroup?: string
    }[]
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided." }, { status: 400 })
  }

  if (rows.length > 200) {
    return NextResponse.json({ error: "Maximum 200 students per import." }, { status: 400 })
  }

  // Pre-load classes for name lookup
  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, section: true },
  })

  function findClass(name?: string, id?: string) {
    if (id) return classes.find(c => c.id === id) ?? null
    if (!name) return null
    const lower = name.trim().toLowerCase()
    return classes.find(c =>
      `${c.name}${c.section ? ` ${c.section}` : ""}`.toLowerCase() === lower
      || c.name.toLowerCase() === lower
    ) ?? null
  }

  const hashed = await bcrypt.hash("changeme123", 10)

  const results: { row: number; name: string; status: "ok" | "error"; error?: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = i + 1

    if (!r.name?.trim()) {
      results.push({ row: rowNum, name: r.name ?? "", status: "error", error: "Name is required." })
      continue
    }

    const cls = findClass(r.className, r.classId)

    // Auto-generate email if not provided
    const email = r.email?.trim()
      || `student_${r.name.trim().toLowerCase().replace(/\s+/g, ".")}_${Date.now()}_${i}@noreply.local`

    // Map gender
    const gender = r.gender
      ? r.gender.toUpperCase().startsWith("F") ? "FEMALE"
        : r.gender.toUpperCase().startsWith("M") ? "MALE"
        : r.gender.toUpperCase() === "OTHER" ? "OTHER"
        : null
      : null

    try {
      await prisma.user.create({
        data: {
          schoolId,
          name: r.name.trim(),
          email,
          password: hashed,
          phone: r.phone?.trim() || null,
          role: "STUDENT",
          student: {
            create: {
              schoolId,
              classId: cls?.id || null,
              rollNumber: r.rollNumber?.trim() || null,
              studentId: r.studentId?.trim() || null,
              gender,
              dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth) : null,
              nationality: r.nationality?.trim() || "Ghanaian",
              address: r.address?.trim() || null,
              religion: r.religion?.trim() || null,
              bloodGroup: r.bloodGroup?.trim() || null,
            },
          },
        },
      })
      results.push({ row: rowNum, name: r.name, status: "ok" })
    } catch (e: any) {
      const msg = e.code === "P2002"
        ? "Email already exists in this school."
        : e.message || "Failed to create student."
      results.push({ row: rowNum, name: r.name, status: "error", error: msg })
    }
  }

  const succeeded = results.filter(r => r.status === "ok").length
  const failed    = results.filter(r => r.status === "error").length

  return NextResponse.json({ succeeded, failed, results })
}
