"use client"

import { useState } from "react"
import { Bell, Plus, Trash2 } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatDate, cn } from "@/lib/utils"

type Notice = { id: string; title: string; content: string; audience: string | null; priority: string; createdAt: string | Date; expiresAt: string | Date | null }
const AUDIENCES = ["ALL", "STUDENTS", "TEACHERS", "PARENTS", "STAFF"]
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"]
const PRIORITY_COLORS: Record<string, string> = { LOW: "bg-gray-100 text-gray-600", NORMAL: "bg-blue-50 text-blue-700", HIGH: "bg-amber-50 text-amber-700", URGENT: "bg-red-50 text-red-700" }
const emptyForm = { title: "", content: "", audience: "ALL", priority: "NORMAL", expiresAt: "" }

export default function NoticeClient({ notices: initial, schoolId }: { notices: Notice[]; schoolId: string }) {
  const [notices, setNotices] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      const notice = await res.json()
      setNotices(prev => [notice, ...prev])
      setOpen(false); setForm(emptyForm)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this notice?")) return
    await fetch(`/api/notices/${id}`, { method: "DELETE" })
    setNotices(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notice Board" description={`${notices.length} notice${notices.length !== 1 ? "s" : ""}`} action={
        <button onClick={() => { setOpen(true); setError(""); setForm(emptyForm) }} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" /> Post Notice
        </button>
      } />

      {notices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <Bell className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No notices posted</h2>
          <button onClick={() => setOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Post Notice</button>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map(n => (
            <div key={n.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0"><Bell className="w-5 h-5 text-indigo-500" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-gray-900">{n.title}</h3>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", PRIORITY_COLORS[n.priority] || "bg-gray-100 text-gray-600")}>{n.priority}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{n.audience}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(n.createdAt)}{n.expiresAt ? ` · Expires ${formatDate(n.expiresAt)}` : ""}</p>
                </div>
                <button onClick={() => handleDelete(n.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Post Notice</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div><label className="label">Title *</label><input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Parent-Teacher Meeting Notice" /></div>
              <div><label className="label">Content *</label><textarea className="input min-h-[120px] resize-none" required value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write notice content…" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Audience</label><select className="input" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>{AUDIENCES.map(a => <option key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase()}</option>)}</select></div>
                <div><label className="label">Priority</label><select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>{PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}</select></div>
              </div>
              <div><label className="label">Expires On</label><input type="date" className="input" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Posting…" : "Post Notice"}</button>
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
