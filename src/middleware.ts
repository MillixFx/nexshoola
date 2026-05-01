import { NextRequest, NextResponse } from "next/server"

/**
 * Multi-tenant subdomain routing.
 *
 * Architecture:
 *   - apex domain (nexschoola.com / vercel preview / localhost):
 *       → serve marketing pages, /login, /register, /super-admin, etc. normally
 *   - subdomain (gis.nexschoola.com):
 *       → tag the request with x-school-slug header
 *       → redirect / to /login?slug=gis so the user lands on a pre-filled login
 *       → /dashboard/* and /api/* are unchanged (auth-driven scoping still applies)
 *
 * For local development:
 *   - localhost:3000          → apex (marketing)
 *   - gis.localhost:3000      → tenant
 *   - or use ?slug=gis in URL for testing
 *
 * Reserved subdomains that are NOT treated as schools:
 *   www, app, admin, api, vercel, preview, mail, ftp, *-vercel.app
 */

const RESERVED = new Set(["www", "app", "admin", "api", "mail", "ftp", "preview", "staging"])

function extractSlug(host: string): string | null {
  // Strip port
  const hostname = host.split(":")[0]

  // Vercel preview deployments: <project>-<hash>.vercel.app — treat as apex
  if (hostname.endsWith(".vercel.app")) return null

  // Localhost (dev): "gis.localhost" → "gis"; "localhost" → null
  if (hostname.endsWith("localhost") || hostname === "localhost") {
    const parts = hostname.split(".")
    if (parts.length >= 2 && parts[0] !== "localhost") {
      const slug = parts[0]
      return RESERVED.has(slug) ? null : slug
    }
    return null
  }

  // Production: split on '.', expect <slug>.nexschoola.com or similar
  const parts = hostname.split(".")
  if (parts.length < 3) return null // apex like "nexschoola.com" → no subdomain
  const slug = parts[0]
  if (RESERVED.has(slug)) return null
  return slug
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  const url = req.nextUrl
  const pathname = url.pathname

  // Skip framework internals + auth API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  const slug = extractSlug(host) || url.searchParams.get("subdomain")

  if (!slug) return NextResponse.next()

  // We're on a tenant subdomain. Inject the slug into request headers so
  // server components / route handlers can read it via headers().
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-school-slug", slug)

  // For unauthenticated users hitting the root, send them to a slug-prefilled login.
  // (Authenticated users are already inside /dashboard, so this only fires for fresh visits.)
  if (pathname === "/" || pathname === "") {
    const loginUrl = new URL("/login", url)
    loginUrl.searchParams.set("slug", slug)
    return NextResponse.redirect(loginUrl)
  }

  // Block the marketing /register page on tenant subdomains — registration is apex-only
  if (pathname === "/register") {
    const apex = new URL("https://nexschoola.com/register")
    return NextResponse.redirect(apex)
  }

  // Block super-admin on tenant subdomains
  if (pathname.startsWith("/super-admin")) {
    return NextResponse.redirect(new URL("/login", url))
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

// Run on every request except static asset extensions
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
}
