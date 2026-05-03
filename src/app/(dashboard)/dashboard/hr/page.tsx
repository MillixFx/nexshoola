import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import HRClient from "./HRClient"

export const dynamic = "force-dynamic"

export default async function HRPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const role = session?.user?.role ?? ""
  if (!["ADMIN", "HEADMASTER", "HR"].includes(role)) redirect("/dashboard")

  const employees = await prisma.employee.findMany({
    where: { schoolId },
    select: {
      id: true, employeeId: true, role: true, department: true,
      gender: true, address: true, photo: true, joiningDate: true, isActive: true,
      user: { select: { name: true, email: true, phone: true, isActive: true, role: true } },
    },
    orderBy: { joiningDate: "desc" },
  })

  return (
    <HRClient
      employees={employees.map(e => ({ ...e, joiningDate: e.joiningDate.toISOString() }))}
      canDelete={["ADMIN", "HEADMASTER"].includes(role)}
    />
  )
}
