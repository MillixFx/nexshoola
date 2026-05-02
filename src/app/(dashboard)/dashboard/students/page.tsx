import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import StudentsClient from "./StudentsClient"

export const dynamic = "force-dynamic"

export default async function StudentsPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const role     = session?.user?.role ?? ""
  const userId   = session?.user?.id ?? ""
  const isParent = role === "PARENT"

  // Admissions access: ADMIN/HEADMASTER always; others need explicit delegation
  let canAdmit = role === "ADMIN" || role === "HEADMASTER"
  if (!canAdmit && userId) {
    const perm = await prisma.userPermission.findUnique({
      where: { schoolId_userId_permission: { schoolId, userId, permission: "ADMIT_STUDENTS" } },
    })
    if (perm) canAdmit = true
  }

  let studentFilter: object = { schoolId }

  if (isParent) {
    // Find the parent record linked to this user
    const parentRecord = await prisma.parent.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (parentRecord) {
      studentFilter = {
        schoolId,
        parents: { some: { parentId: parentRecord.id } },
      }
    } else {
      // Parent record not found — show no students
      studentFilter = { schoolId, id: "__none__" }
    }
  }

  const [students, classes, school] = await Promise.all([
    prisma.student.findMany({
      where: studentFilter,
      select: {
        id: true, rollNumber: true, studentId: true, gender: true,
        admissionDate: true, isActive: true, photo: true,
        dateOfBirth: true, bloodGroup: true, nationality: true,
        user: { select: { name: true, email: true, phone: true, isActive: true } },
        class: { select: { name: true, section: true } },
      },
      orderBy: { admissionDate: "desc" },
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, logo: true, address: true, phone: true, email: true, headmaster: true },
    }),
  ])

  return <StudentsClient students={students} classes={classes} schoolId={schoolId} isParent={isParent} school={school} canAdmit={canAdmit} />
}
