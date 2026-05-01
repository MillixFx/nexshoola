"use client"

import { useState } from "react"
import { Search, Building2, Users, CheckCircle2, XCircle, Loader2, ChevronDown, X, Zap } from "lucide-react"
import { formatDate, cn } from "@/lib/utils"

type School = {
  id: string; name: string; slug: string; country: string; currency: string
  plan: string; isActive: boolean; createdAt: string | Date
  paystackSubaccountCode: string | null
  paystackBankCode: string | null; paystackAccountNumber: string | null
  paystackAccountName: string | null; paystackBusinessName: string | null
  subscriptionPaidAt: string | Date | null; subscriptionNotes: string | null
  _count: { students: number; teachers: number; parents: number }
}

const PLANS = ["FREE", "BASIC", "PRO", "ENTERPRISE"]
const PLAN_COLOR: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  BASIC: "bg-blue-50 text-blue-700",
  PRO: "bg-indigo-50 text-indigo-700",
  ENTERPRISE: "bg-purple-50 text-purple-700",
}

export default function SchoolsClient({ schools: initial }: { schools: School[] }) {
  const [schools, setSchools] = useState(initial)
  const [search, setSearch] = useState("")
  const [editSchool, setEditSchool] = useState<School | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [editForm, setEditForm] = useState({
    plan: "", isActive: true, subscriptionPaidAt: "", subscriptionNotes: "",
    paystackSubaccountCode: "", paystackBankCode: "", paystackAccountNumber: "",
    paystackAccountName: "", paystackBusinessName: "",
  })

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  )

  function openEdit(school: School) {
    setEditSchool(school)
    setEditForm({
      plan: school.plan,
      isActive: school.isActive,
      subscriptionPaidAt: school.subscriptionPaidAt ? new Date(school.subscriptionPaidAt).toISOString().split("T")[0] : "",
      subscriptionNotes: school.subscriptionNotes ?? "",
      paystackSubaccountCode: school.paystackSubaccountCode ?? "",
      paystackBankCode: school.paystackBankCode ?? "",
      paystackAccountNumber: school.paystackAccountNumber ?? "",
      paystackAccountName: school.paystackAccountName ?? "",
      paystackBusinessName: school.paystackBusinessName ?? "",
    })
    setError("")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editSchool) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/super-admin/schools/${editSchool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await res.json()
      setSchools(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
      setEditSchool(null)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function toggleActive(school: School) {
    const res = await fetch(`/api/super-admin/schools/${school.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !school.isActive }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSchools(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Schools</h1>
          <p className="text-sm text-gray-500 mt-1">{schools.length} school{schools.length !== 1 ? "s" : ""} registered</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by school name or slug…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">School</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Students</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Plan</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Subscription</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Paystack</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Registered</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">No schools found.</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{s.slug}.nexschoola.com</p>
                </td>
                <td className="px-4 py-3 text-center font-bold text-gray-700">{s._count.students}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", PLAN_COLOR[s.plan] ?? "bg-gray-100 text-gray-600")}>{s.plan}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {s.subscriptionPaidAt ? (
                    <span className="text-xs text-emerald-600 font-semibold">{formatDate(s.subscriptionPaidAt)}</span>
                  ) : (
                    <span className="text-xs text-red-400 font-medium">Not paid</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {s.paystackSubaccountCode ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(s)} className={cn("text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity",
                    s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {s.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">{formatDate(s.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(s)} className="text-xs font-semibold text-indigo-600 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Edit School Modal */}
      {editSchool && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit School</h2>
                <p className="text-xs text-gray-400">{editSchool.name}</p>
              </div>
              <button onClick={() => setEditSchool(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

              {/* Plan & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Plan</label>
                  <div className="relative">
                    <select className="input appearance-none pr-8" value={editForm.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}>
                      {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="label">Status</label>
                  <div className="relative">
                    <select className="input appearance-none pr-8" value={editForm.isActive ? "1" : "0"} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.value === "1" }))}>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Subscription */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Subscription</p>
                <div>
                  <label className="label">Last Payment Date</label>
                  <input type="date" className="input" value={editForm.subscriptionPaidAt} onChange={e => setEditForm(f => ({ ...f, subscriptionPaidAt: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" value={editForm.subscriptionNotes} onChange={e => setEditForm(f => ({ ...f, subscriptionNotes: e.target.value }))} placeholder="e.g. Paid via bank transfer" />
                </div>
              </div>

              {/* Paystack Subaccount */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Paystack Subaccount</p>
                <p className="text-xs text-gray-400">Enter these to connect this school&apos;s bank account for direct fee payouts.</p>
                <div>
                  <label className="label">Business Name</label>
                  <input className="input" value={editForm.paystackBusinessName} onChange={e => setEditForm(f => ({ ...f, paystackBusinessName: e.target.value }))} placeholder="School Name Ltd" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Bank Code</label>
                    <input className="input" value={editForm.paystackBankCode} onChange={e => setEditForm(f => ({ ...f, paystackBankCode: e.target.value }))} placeholder="030" />
                  </div>
                  <div>
                    <label className="label">Account Number</label>
                    <input className="input" value={editForm.paystackAccountNumber} onChange={e => setEditForm(f => ({ ...f, paystackAccountNumber: e.target.value }))} placeholder="0123456789" />
                  </div>
                </div>
                <div>
                  <label className="label">Account Name (as in bank)</label>
                  <input className="input" value={editForm.paystackAccountName} onChange={e => setEditForm(f => ({ ...f, paystackAccountName: e.target.value }))} placeholder="GIS School Account" />
                </div>
                <div>
                  <label className="label">Subaccount Code (from Paystack)</label>
                  <input className="input font-mono text-xs" value={editForm.paystackSubaccountCode} onChange={e => setEditForm(f => ({ ...f, paystackSubaccountCode: e.target.value }))} placeholder="ACCT_xxxxxxxxxxxxxxx" />
                  <p className="text-[10px] text-gray-400 mt-1">Create via Paystack dashboard or use the auto-create button below.</p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    if (!editSchool) return
                    setSaving(true); setError("")
                    try {
                      // First save the bank details
                      await fetch(`/api/super-admin/schools/${editSchool.id}`, {
                        method: "PUT", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ paystackBankCode: editForm.paystackBankCode, paystackAccountNumber: editForm.paystackAccountNumber, paystackBusinessName: editForm.paystackBusinessName }),
                      })
                      // Then auto-create subaccount
                      const res = await fetch(`/api/super-admin/schools/${editSchool.id}/subaccount`, { method: "POST" })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error)
                      setEditForm(f => ({ ...f, paystackSubaccountCode: data.subaccountCode }))
                      alert(`Subaccount created! Code: ${data.subaccountCode}`)
                    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
                  }}
                  className="w-full py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-xl text-xs font-semibold hover:bg-emerald-100 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Zap className="w-3.5 h-3.5" /> Auto-Create Paystack Subaccount</>}
                </button>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditSchool(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>
    </div>
  )
}
