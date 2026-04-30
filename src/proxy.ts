import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "nexschoola.com"
const PUBLIC_PATHS = ["/", "/pricing", "/features", "/about", "/contact", "/login", "/register"]

// Routes each role is allowed to visit (prefix-matched)
const ROLE_ALLOWED: Record<string, string[]> = {
  ADMIN:      ["*"],
  HEADMASTER: ["*"],
  // Payroll is admin-only — intentionally not in TEACHER/STUDENT/PARENT lists
  TEACHER: [
    "/dashboard", "/dashboard/students", "/dashboard/classes", "/dashboard/subjects",
    "/dashboard/attendance", "/dashboard/examinations", "/dashboard/library",
    "/dashboard/notice", "/dashboard/messages", "/dashboard/leave",
    "/dashboard/suggestions", "/dashboard/calendar", "/dashboard/settings",
    "/dashboard/payroll",
  ],
  STUDENT: [
    "/dashboard", "/dashboard/attendance", "/dashboard/examinations",
    "/dashboard/library", "/dashboard/notice", "/dashboard/messages",
    "/dashboard/suggestions", "/dashboard/calendar",
  ],
  PARENT: [
    "/dashboard", "/dashboard/students", "/dashboard/attendance",
    "/dashboard/finance", "/dashboard/library", "/dashboard/notice",
    "/dashboard/messages", "/dashboard/suggestions", "/dashboard/calendar",
  ],
}

function isRolePermitted(role: string, pathname: string): boolean {
  const allowed = ROLE_ALLOWED[role] ?? ROLE_ALLOWED.STUDENT
  if (allowed.includes("*")) return true
  if (pathname === "/dashboard") return true
  return allowed.some((route) => pathname === route || pathname.startsWith(route + "/"))
}

export default auth(async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const hostname = req.headers.get("host") || ""
  const host = hostname.replace(/:.*/, "")

  const isRootDomain =
    host === ROOT_DOMAIN ||
    host === `www.${ROOT_DOMAIN}` ||
    host === "localhost" ||
    host.endsWith(".vercel.app")

  const subdomain = isRootDomain ? null : host.replace(`.${ROOT_DOMAIN}`, "")
  const session = (req as any).auth
  const pathname = url.pathname

  // ── Root domain ──────────────────────────────────────────────────────
  if (isRootDomain) {
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith("/api/") || pathname.startsWith("/_next/")
    )

    // Not logged in → login page for protected routes
    if (!isPublic && !session) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Logged in + dashboard route → enforce role-based access
    if (session && pathname.startsWith("/dashboard")) {
      const role = (session.user as any)?.role ?? "STUDENT"
      if (!isRolePermitted(role, pathname)) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    return NextResponse.next()
  }

  // ── School subdomain ─────────────────────────────────────────────────
  if (subdomain) {
    url.pathname = `/${subdomain}${url.pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
