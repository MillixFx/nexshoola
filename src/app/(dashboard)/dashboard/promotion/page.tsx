import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import PromotionClient from "./PromotionClient"

export const dynamic = "force-dynamic"

export default async function PromotionPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const role = session?.user?.role ?? ""
  if (!["ADMIN", "HEADMASTER"].includes(role)) redirect("/dashboard")

  const [classes, students] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ name: "asc" }, { section: "asc" }],
      include: { _count: { select: { students: true } } },
    }),
    prisma.student.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        classId: true,
        rollNumber: true,
        studentId: true,
        user: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  return <PromotionClient classes={classes} students={students} />
}
