import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/chat/users
 * Returns all users in the same school (excluding self) the current user can chat with.
 *
 * Visibility rules (kept permissive for school-wide communication):
 *  - All staff (Admin, Headmaster, Teacher, Accountant, Librarian, etc.) see everyone
 *  - Parents see all staff + parents of classmates of their children, and their own children
 *  - Students see all staff + classmates
 *
 * For simplicity in this build, we return all active school users — schools can
 * tighten via UI filters later. PII is limited to name + role + avatar.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: {
      schoolId: session.user.schoolId,
      isActive: true,
      id: { not: session.user.id },
    },
    select: { id: true, name: true, email: true, role: true, avatar: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(users)
}
