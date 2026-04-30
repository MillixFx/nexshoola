import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SchoolsClient from "./SchoolsClient"

export const dynamic = "force-dynamic"

export default async function SuperAdminSchoolsPage() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/login")

  const schools = await prisma.school.findMany({
    include: {
      _count: { select: { students: true, teachers: true, parents: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return <SchoolsClient schools={schools as any} />
}
