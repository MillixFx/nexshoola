"use client"

import Link from "next/link"
import { Suspense, useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap, Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-indigo-900 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Silently captured from subdomain middleware (?slug=demo) — not shown to user
  const slug = searchParams.get("slug") ?? ""

  const [form, setForm] = useState({ email: "", password: "" })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      schoolSlug: slug,   // "" on main domain, "demo" on demo.nexschoola.com
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError("Invalid email or password. Please try again.")
      return
    }

    // Fetch the new session to determine correct dashboard destination
    const session = await getSession()
    const role = (session?.user as any)?.role
    router.push(role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-white">
              Nex<span className="text-indigo-300">Schoola</span>
            </span>
          </Link>
          <p className="text-indigo-300 text-sm mt-3">
            {slug
              ? `Signing in to ${slug}.nexschoola.com`
              : "Sign in to your dashboard"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-6 sm:p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Welcome back</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="you@school.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold py-3.5 rounded-xl transition-colors shadow-md shadow-indigo-200 text-sm flex items-center justify-center gap-2 disabled:opacity-60 bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
              Register your school
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
