import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

const STAFF_ROLES: Role[] = ["ADMIN", "HEADMASTER", "TEACHER", "ACCOUNTANT", "LIBRARIAN"]

/**
 * GET /api/chat/users
 * Returns users in the same school (excluding self) the current user can chat with.
 *
 * Role-based visibility:
 *  PARENT  → staff only (ADMIN, HEADMASTER, TEACHER, ACCOUNTANT, LIBRARIAN)
 *  STUDENT → staff + other STUDENTs
 *  Others  → everyone in the school
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role as Role

  let roleFilter: Role[] | undefined

  if (role === "PARENT") {
    roleFilter = STAFF_ROLES
  } else if (role === "STUDENT") {
    roleFilter = [...STAFF_ROLES, "STUDENT"]
  }
  // otherwise (staff): no role filter — see everyone

  const users = await prisma.user.findMany({
    where: {
      schoolId: session.user.schoolId,
      isActive: true,
      id: { not: session.user.id },
      ...(roleFilter ? { role: { in: roleFilter } } : {}),
    },
    select: { id: true, name: true, email: true, role: true, avatar: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(users)
}
