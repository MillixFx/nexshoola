import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/", "/pricing", "/features", "/about", "/contact", "/login", "/register"]
const SUPER_ADMIN_PREFIX = "/super-admin"

// Subdomains that are never school slugs
const RESERVED = new Set(["www", "app", "admin", "api", "mail", "ftp", "preview", "staging"])

// Routes each role is allowed to visit (prefix-matched)
const ROLE_ALLOWED: Record<string, string[]> = {
  ADMIN:      ["*"],
  HEADMASTER: ["*"],
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

/**
 * Extracts the school slug from the host header.
 * Returns null for the apex domain (nexschoola.com, localhost, *.vercel.app).
 */
function extractSlug(host: string): string | null {
  const hostname = host.split(":")[0]

  // Vercel preview deployments → treat as apex
  if (hostname.endsWith(".vercel.app")) return null

  // Local dev: "gis.localhost" → "gis"; "localhost" → null
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    const parts = hostname.split(".")
    if (parts.length >= 2 && parts[0] !== "localhost") {
      const slug = parts[0]
      return RESERVED.has(slug) ? null : slug
    }
    return null
  }

  // Production: <slug>.nexschoola.com
  const parts = hostname.split(".")
  if (parts.length < 3) return null // apex like "nexschoola.com"
  const slug = parts[0]
  return RESERVED.has(slug) ? null : slug
}

export default auth(async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone()
  const host = req.headers.get("host") ?? ""
  const pathname = url.pathname
  const session = (req as any).auth

  // Skip framework internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  const slug = extractSlug(host)

  // ── Tenant subdomain (e.g. greenhill.nexschoola.com) ─────────────────
  if (slug) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-school-slug", slug)

    // Root → redirect to /login?slug=... so the field is pre-filled
    if (pathname === "/" || pathname === "") {
      const loginUrl = new URL("/login", url)
      loginUrl.searchParams.set("slug", slug)
      return NextResponse.redirect(loginUrl)
    }

    // Registration is apex-only
    if (pathname === "/register") {
      return NextResponse.redirect(new URL("https://nexschoola.com/register"))
    }

    // Super-admin is apex-only
    if (pathname.startsWith("/super-admin")) {
      return NextResponse.redirect(new URL("/login", url))
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // ── Apex domain (marketing + auth + super-admin) ──────────────────────
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith("/api/") || pathname.startsWith("/_next/")
  )

  // Not logged in → redirect to login
  if (!isPublic && !session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Super admin routes
  if (pathname.startsWith(SUPER_ADMIN_PREFIX)) {
    const role = (session?.user as any)?.role
    if (!session || role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // Dashboard role-based access
  if (session && pathname.startsWith("/dashboard")) {
    const role = (session.user as any)?.role ?? "STUDENT"
    if (!isRolePermitted(role, pathname)) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
}
