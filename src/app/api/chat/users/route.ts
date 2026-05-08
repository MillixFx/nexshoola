import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

const STAFF_ROLES: Role[] = ["ADMIN", "HEADMASTER", "TEACHER", "ACCOUNTANT", "LIBRARIAN"]

/**
 * GET /api/chat/users
 * Returns users the current user can start a conversation with.
 *
 * SUPER_ADMIN  → all ADMIN/HEADMASTER users across every school
 * ADMIN/HEADMASTER/TEACHER/ACCOUNTANT/LIBRARIAN
 *               → everyone in their school + SUPER_ADMIN (platform owner)
 * STUDENT       → staff + other students in their school (no SUPER_ADMIN)
 * PARENT        → staff only in their school (no SUPER_ADMIN)
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role as Role

  // ── SUPER_ADMIN: see all ADMIN/HEADMASTER across all schools ──────────
  if (role === "SUPER_ADMIN") {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: session.user.id },
        role: { in: ["ADMIN", "HEADMASTER"] },
      },
      select: { id: true, name: true, email: true, role: true, avatar: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    })
    return NextResponse.json(users)
  }

  // ── School users require schoolId ─────────────────────────────────────
  if (!session.user.schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let roleFilter: Role[] | undefined
  if (role === "PARENT") {
    roleFilter = STAFF_ROLES
  } else if (role === "STUDENT") {
    roleFilter = [...STAFF_ROLES, "STUDENT"]
  }

  const schoolUsers = await prisma.user.findMany({
    where: {
      schoolId: session.user.schoolId,
      isActive: true,
      id: { not: session.user.id },
      ...(roleFilter ? { role: { in: roleFilter } } : {}),
    },
    select: { id: true, name: true, email: true, role: true, avatar: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  // Staff roles can also message the Platform Owner (SUPER_ADMIN)
  if (STAFF_ROLES.includes(role)) {
    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    })
    return NextResponse.json([...superAdmins, ...schoolUsers])
  }

  return NextResponse.json(schoolUsers)
}
