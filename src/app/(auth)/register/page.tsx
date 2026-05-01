"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, Loader2, Eye, EyeOff, Check } from "lucide-react"

const PERKS = ["1 month free trial", "No credit card required", "All 20 modules included", "Cancel anytime"]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<"form" | "done">("form")
  const [form, setForm] = useState({ schoolName: "", slug: "", adminName: "", email: "", password: "", country: "GH", currency: "GHS" })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function slugify(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep("done")
    } catch (err: any) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-900/50">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">You&apos;re all set!</h1>
          <p className="text-indigo-300 mb-2">Your school <strong className="text-white">{form.schoolName}</strong> is ready.</p>
          <p className="text-indigo-300 text-sm mb-8">Your subdomain: <span className="text-white font-mono font-bold">{form.slug}.nexschoola.com</span></p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-white text-indigo-700 font-bold py-3.5 rounded-xl hover:bg-indigo-50 transition-colors text-sm"
          >
            Go to Login →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center">

        {/* Left: pitch */}
        <div className="hidden lg:block text-white">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl">Nex<span className="text-indigo-300">Schoola</span></span>
          </Link>
          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Run your school<br />
            <span className="text-indigo-300">smarter, not harder.</span>
          </h2>
          <p className="text-indigo-200 text-sm leading-relaxed mb-8">
            20 modules — students, teachers, exams, fees, payroll, library, transport and more.
            Set up in minutes, GH₵15 per student per term after the trial.
          </p>
          <ul className="space-y-3">
            {PERKS.map(p => (
              <li key={p} className="flex items-center gap-3 text-sm text-indigo-200">
                <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: form */}
        <div>
          <div className="text-center mb-6 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">Nex<span className="text-indigo-300">Schoola</span></span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-6 sm:p-8">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Register your school</h1>
            <p className="text-sm text-gray-500 mb-6">1 month free · no card required</p>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">School Name *</label>
                <input
                  required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Accra International School"
                  value={form.schoolName}
                  onChange={e => {
                    const name = e.target.value
                    setForm(f => ({ ...f, schoolName: name, slug: slugify(name) }))
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Subdomain *</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                  <input
                    required className="flex-1 px-4 py-3 text-sm outline-none"
                    placeholder="accraschool"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                    minLength={3}
                  />
                  <span className="bg-gray-50 px-3 py-3 text-xs text-gray-400 border-l border-gray-200 shrink-0">.nexschoola.com</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                    <option value="GH">Ghana</option>
                    <option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option>
                    <option value="ZA">South Africa</option>
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    <option value="GHS">GHS — Ghana Cedis</option>
                    <option value="NGN">NGN — Naira</option>
                    <option value="KES">KES — Shilling</option>
                    <option value="USD">USD — Dollar</option>
                    <option value="GBP">GBP — Pound</option>
                  </select>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Full Name *</label>
                <input required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Kwame Mensah" value={form.adminName} onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                <input required type="email" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="admin@yourschool.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                <div className="relative">
                  <input
                    required type={showPw ? "text" : "password"} minLength={8}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-md shadow-indigo-200 text-sm flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Creating your school…" : "Start Free Trial →"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already registered?{" "}
              <Link href="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
