"use client"

import { useState, useRef } from "react"
import { Settings, Save, Check, Upload, X, GraduationCap, BookOpen } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"

type School = {
  id: string; name: string; slug: string
  logo: string | null; address: string | null; phone: string | null
  email: string | null; headmaster: string | null
  country: string; currency: string; timezone: string
  startYear: number | null; plan: string
  currentAcademicYear: string | null; currentTerm: string | null
} | null

const TERMS = [
  "Term 1", "Term 2", "Term 3",
  "First Term", "Second Term", "Third Term",
  "Semester 1", "Semester 2",
]

export default function SettingsClient({ school }: { school: School }) {
  const [form, setForm] = useState({
    name: school?.name ?? "",
    slug: school?.slug ?? "",
    address: school?.address ?? "",
    phone: school?.phone ?? "",
    email: school?.email ?? "",
    headmaster: school?.headmaster ?? "",
    country: school?.country ?? "GH",
    currency: school?.currency ?? "GHS",
    timezone: school?.timezone ?? "Africa/Accra",
    startYear: school?.startYear ? String(school.startYear) : "",
    logo: school?.logo ?? "",
    currentAcademicYear: school?.currentAcademicYear ?? "",
    currentTerm: school?.currentTerm ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [logoPreview, setLogoPreview] = useState<string>(school?.logo ?? "")
  const fileRef = useRef<HTMLInputElement>(null)

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { setError("Logo must be under 500 KB"); return }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setLogoPreview(dataUrl)
      setForm(f => ({ ...f, logo: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setSaved(false)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: school?.id, ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  if (!school) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
        <Settings className="w-10 h-10 text-indigo-300 mb-3" />
        <h2 className="font-bold text-gray-800">No school configured</h2>
        <p className="text-sm text-gray-500 mt-1">A school record needs to be created first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your school information" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">{error}</div>}

        {/* School Logo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-500" /> School Logo
          </h2>
          <div className="flex items-start gap-6">
            {/* Preview */}
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 shrink-0 overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="School logo" className="w-full h-full object-contain p-1" />
              ) : (
                <GraduationCap className="w-10 h-10 text-gray-300" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              {/* File upload */}
              <div>
                <input
                  type="file"
                  ref={fileRef}
                  accept="image/*"
                  onChange={handleLogoFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-sm font-semibold text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Upload Logo
                </button>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, or SVG — max 500 KB</p>
              </div>
              {/* URL input */}
              <div>
                <label className="label">Or paste image URL</label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    type="url"
                    value={logoPreview.startsWith("data:") ? "" : form.logo}
                    onChange={e => {
                      setForm(f => ({ ...f, logo: e.target.value }))
                      setLogoPreview(e.target.value)
                    }}
                    placeholder="https://example.com/logo.png"
                  />
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => { setLogoPreview(""); setForm(f => ({ ...f, logo: "" })) }}
                      className="p-2.5 text-gray-400 hover:text-red-500 border border-gray-200 rounded-xl hover:border-red-200 transition-colors"
                      title="Remove logo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Year & Term */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" /> Academic Calendar
          </h2>
          <p className="text-xs text-gray-400 mb-4">This sets the default academic year and term used across report cards, fee slips, and exams.</p>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="label">Current Academic Year</label>
              <input
                className="input"
                value={form.currentAcademicYear}
                onChange={e => setForm(f => ({ ...f, currentAcademicYear: e.target.value }))}
                placeholder="e.g. 2024/2025"
              />
            </div>
            <div>
              <label className="label">Current Term / Semester</label>
              <select
                className="input"
                value={form.currentTerm}
                onChange={e => setForm(f => ({ ...f, currentTerm: e.target.value }))}
              >
                <option value="">— Select term —</option>
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* School Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-5">School Information</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="label">School Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ghana International School" />
            </div>
            <div>
              <label className="label">Subdomain (slug) *</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <input
                  className="flex-1 px-4 py-2.5 text-sm outline-none"
                  required
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="gis"
                />
                <span className="bg-gray-50 px-3 py-2.5 text-xs text-gray-400 border-l border-gray-200">.nexschoola.com</span>
              </div>
            </div>
            <div>
              <label className="label">Headmaster / Principal</label>
              <input className="input" value={form.headmaster} onChange={e => setForm(f => ({ ...f, headmaster: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label className="label">Year Founded</label>
              <input className="input" type="number" value={form.startYear} onChange={e => setForm(f => ({ ...f, startYear: e.target.value }))} placeholder="1990" />
            </div>
          </div>
        </div>

        {/* Locale */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-5">Localisation</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label className="label">Country</label>
              <select className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                <option value="GH">Ghana</option>
                <option value="NG">Nigeria</option>
                <option value="KE">Kenya</option>
                <option value="ZA">South Africa</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="GHS">GHS — Ghana Cedis</option>
                <option value="NGN">NGN — Naira</option>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
            <div>
              <label className="label">Timezone</label>
              <select className="input" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                <option value="Africa/Accra">Africa/Accra (GMT+0)</option>
                <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (GMT+3)</option>
                <option value="Africa/Johannesburg">Africa/Johannesburg (GMT+2)</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscription info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-2">Subscription</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">{school.plan} Plan</span>
            <a href="/pricing" className="text-sm text-indigo-600 hover:underline font-medium">Upgrade →</a>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors ${
              saved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </form>

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>
    </div>
  )
}
