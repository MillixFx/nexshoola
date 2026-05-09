import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import StaffAttendanceClient from "./StaffAttendanceClient"

export const dynamic = "force-dynamic"

export default async function StaffAttendancePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  return (
    <StaffAttendanceClient
      currentUserId={session.user.id}
      currentUserRole={session.user.role ?? ""}
      schoolId={session.user.schoolId}
    />
  )
}
