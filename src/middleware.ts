import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Routes each role is ALLOWED to visit (prefix match)
const ALLOWED: Record<string, string[]> = {
  ADMIN: ["*"],
  HEADMASTER: ["*"],
  TEACHER: [
    "/dashboard",
    "/dashboard/students",
    "/dashboard/classes",
    "/dashboard/subjects",
    "/dashboard/attendance",
    "/dashboard/examinations",
    "/dashboard/library",
    "/dashboard/notice",
    "/dashboard/messages",
    "/dashboard/leave",
    "/dashboard/suggestions",
    "/dashboard/calendar",
    "/dashboard/settings",
  ],
  STUDENT: [
    "/dashboard",
    "/dashboard/attendance",
    "/dashboard/examinations",
    "/dashboard/library",
    "/dashboard/notice",
    "/dashboard/messages",
    "/dashboard/suggestions",
    "/dashboard/calendar",
  ],
  PARENT: [
    "/dashboard",
    "/dashboard/students",
    "/dashboard/attendance",
    "/dashboard/finance",
    "/dashboard/library",
    "/dashboard/notice",
    "/dashboard/messages",
    "/dashboard/suggestions",
    "/dashboard/calendar",
  ],
}

export default auth((req) => {
  const session = req.auth
  const { pathname } = req.nextUrl

  // Not logged in → send to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = (session.user as any)?.role as string ?? "STUDENT"
  const allowed = ALLOWED[role] ?? ALLOWED.STUDENT

  // Full access for ADMIN / HEADMASTER
  if (allowed.includes("*")) return NextResponse.next()

  // Exact match on /dashboard itself
  if (pathname === "/dashboard") return NextResponse.next()

  // Check each allowed prefix
  const permitted = allowed.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )

  if (!permitted) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*"],
}
