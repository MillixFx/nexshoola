import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "nexschoola.com"
const PUBLIC_PATHS = ["/", "/pricing", "/features", "/about", "/contact", "/login", "/register"]

export default auth(async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const hostname = req.headers.get("host") || ""

  // Strip port for local dev
  const host = hostname.replace(/:.*/, "")

  // Determine if this is a school subdomain
  const isRootDomain = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` || host === "localhost"
  const subdomain = isRootDomain ? null : host.replace(`.${ROOT_DOMAIN}`, "")

  // ─── Root domain routes (marketing + auth) ───
  if (isRootDomain) {
    const isPublic = PUBLIC_PATHS.some((p) => url.pathname === p || url.pathname.startsWith("/api/"))
    const session = (req as any).auth

    if (!isPublic && !session) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // ─── School subdomain routes ───
  if (subdomain) {
    // Rewrite to /[schoolSlug]/... internally
    url.pathname = `/${subdomain}${url.pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
