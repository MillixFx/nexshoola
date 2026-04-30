"use client"

import Link from "next/link"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { GraduationCap, Loader2, Eye, EyeOff, Shield } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [form, setForm] = useState({ schoolSlug: "", email: "", password: "" })
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
      schoolSlug: isSuperAdmin ? "superadmin" : form.schoolSlug,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError(isSuperAdmin ? "Invalid email or password." : "Invalid school, email or password. Please try again.")
    } else {
      router.push(isSuperAdmin ? "/super-admin" : "/dashboard")
      router.refresh()
    }
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
            {isSuperAdmin ? "Platform owner sign in" : "Sign in to your school dashboard"}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex gap-1 bg-white/10 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setIsSuperAdmin(false); setError("") }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${!isSuperAdmin ? "bg-white text-indigo-700" : "text-indigo-300 hover:text-white"}`}
          >
            School Login
          </button>
          <button
            type="button"
            onClick={() => { setIsSuperAdmin(true); setError("") }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${isSuperAdmin ? "bg-amber-500 text-white" : "text-indigo-300 hover:text-white"}`}
          >
            <Shield className="w-3.5 h-3.5" /> Super Admin
          </button>
        </div>

        {/* Card */}
        <div className={`bg-white rounded-2xl shadow-2xl shadow-black/30 p-8 ${isSuperAdmin ? "ring-2 ring-amber-400" : ""}`}>
          {isSuperAdmin && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold text-amber-700">Platform Owner Access — Full administrative control</p>
            </div>
          )}

          <h1 className="text-xl font-bold text-gray-900 mb-6">
            {isSuperAdmin ? "Super Admin Login" : "Welcome back"}
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* School slug — only for regular users */}
            {!isSuperAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">School subdomain</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                  <input
                    type="text"
                    placeholder="yourschool"
                    value={form.schoolSlug}
                    onChange={e => setForm(f => ({ ...f, schoolSlug: e.target.value }))}
                    required={!isSuperAdmin}
                    className="flex-1 px-4 py-3 text-sm outline-none"
                  />
                  <span className="bg-gray-50 px-3 py-3 text-xs text-gray-400 border-l border-gray-200 shrink-0">
                    .nexschoola.com
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                placeholder={isSuperAdmin ? "owner@nexschoola.com" : "admin@school.com"}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3.5 rounded-xl transition-colors shadow-md text-sm flex items-center justify-center gap-2 disabled:opacity-60 ${isSuperAdmin ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in…" : isSuperAdmin ? "Access Platform" : "Sign in"}
            </button>
          </form>

          {!isSuperAdmin && (
            <p className="text-center text-sm text-gray-500 mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-indigo-600 font-semibold hover:underline">Register your school</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
