import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ── IP-based sliding-window rate limiter ─────────────────────────────────────
// Runs on the Edge — one Map per edge node. Effective against scripted attacks
// since geographic routing keeps the same client on the same edge node.
const rlMap = new Map<string, { count: number; resetAt: number }>()

/** Returns true if the request is allowed, false if it should be blocked. */
function rateLimit(ip: string, bucket: string, limit: number, windowMs: number): boolean {
  const key = `${ip}:${bucket}`
  const now = Date.now()
  const entry = rlMap.get(key)
  if (!entry || now > entry.resetAt) {
    rlMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// Periodically sweep expired entries so the Map doesn't grow forever
let lastSweep = Date.now()
function maybeSweep() {
  const now = Date.now()
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, v] of rlMap) if (now > v.resetAt) rlMap.delete(k)
}

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

  // ── Rate limiting ─────────────────────────────────────────────────────────
  maybeSweep()
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim()
  const tooMany = () =>
    NextResponse.json({ error: "Too many requests. Please slow down and try again." }, { status: 429 })

  // School registration  — 5 per 10 min per IP  (prevents spam signups)
  if (pathname === "/api/register" && req.method === "POST") {
    if (!rateLimit(ip, "register", 5, 10 * 60 * 1000)) return tooMany()
  }
  // Login (NextAuth signin callback) — 15 per min per IP  (brute-force guard)
  if (pathname.startsWith("/api/auth/") && req.method === "POST") {
    if (!rateLimit(ip, "auth-post", 15, 60 * 1000)) return tooMany()
  }
  // Password change — 5 per min per IP
  if (pathname === "/api/auth/change-password" && req.method === "POST") {
    if (!rateLimit(ip, "change-pw", 5, 60 * 1000)) return tooMany()
  }
  // Payment initialisation — 10 per min per IP  (prevents payment spam)
  if (pathname === "/api/paystack/initialize" && req.method === "POST") {
    if (!rateLimit(ip, "paystack-init", 10, 60 * 1000)) return tooMany()
  }
  // Chat messages — 30 per min per IP  (prevents message flooding)
  if (pathname.includes("/api/chat/conversations/") && pathname.endsWith("/messages") && req.method === "POST") {
    if (!rateLimit(ip, "chat-msg", 30, 60 * 1000)) return tooMany()
  }
  // SMS notifications — 10 per min per IP  (SMS costs money)
  if (pathname === "/api/notifications/send" && req.method === "POST") {
    if (!rateLimit(ip, "sms-send", 10, 60 * 1000)) return tooMany()
  }

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
