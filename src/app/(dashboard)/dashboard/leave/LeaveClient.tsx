"use client"

import { useState } from "react"
import { LogOut, Plus, Check, X } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatDate, cn } from "@/lib/utils"

type Application = { id: string; leaveType: string; startDate: string | Date; endDate: string | Date; reason: string | null; status: string; createdAt: string | Date; user: { name: string; role: string } }
type User = { id: string; name: string; role: string }
const STATUS_COLORS: Record<string, string> = { PENDING: "bg-amber-50 text-amber-700", APPROVED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-red-50 text-red-600" }
const LEAVE_TYPES = ["SICK", "CASUAL", "MATERNITY", "PATERNITY", "ANNUAL", "UNPAID", "OTHER"]
const emptyForm = { userId: "", leaveType: "CASUAL", startDate: "", endDate: "", reason: "" }

export default function LeaveClient({ applications: initial, users, schoolId }: { applications: Application[]; users: User[]; schoolId: string }) {
  const [apps, setApps] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
    const app = await res.json()
    setApps(prev => [app, ...prev]); setOpen(false); setForm(emptyForm); setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/leave", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
    const updated = await res.json()
    setApps(prev => prev.map(a => a.id === id ? updated : a))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Management" description={`${apps.length} application${apps.length !== 1 ? "s" : ""}`} action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Apply for Leave</button>
      } />
      {apps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm"><LogOut className="w-10 h-10 text-indigo-300 mb-3" /><h2 className="font-bold text-gray-800 mb-1">No leave applications</h2><button onClick={() => setOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Apply Now</button></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {apps.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{a.user.name}</p><p className="text-xs text-gray-400">{a.user.role}</p></td>
                  <td className="px-4 py-3 text-gray-600">{a.leaveType}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(a.startDate)} — {formatDate(a.endDate)}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{a.reason ?? "—"}</td>
                  <td className="px-4 py-3"><span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600")}>{a.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    {a.status === "PENDING" && (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => updateStatus(a.id, "APPROVED")} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Approve"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => updateStatus(a.id, "REJECTED")} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Reject"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">Apply for Leave</h2><button onClick={() => setOpen(false)} className="text-gray-400 text-xl">×</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Staff Member *</label>
                <select className="input" required value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}>
                  <option value="">— Select —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div><label className="label">Leave Type</label>
                <select className="input" value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Start Date *</label><input type="date" className="input" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><label className="label">End Date *</label><input type="date" className="input" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div><label className="label">Reason</label><textarea className="input min-h-[80px] resize-none" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Submitting…" : "Submit Application"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
    </div>
  )
}
