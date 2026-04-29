"use client"

import { useState } from "react"
import { Lightbulb, Plus } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatDate } from "@/lib/utils"

type Suggestion = { id: string; subject: string; body: string; isAnon: boolean; status: string; createdAt: string | Date; user: { name: string; role: string } | null }
const emptyForm = { subject: "", body: "", isAnonymous: false }

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  REVIEWED: "bg-blue-50 text-blue-700",
  IMPLEMENTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-600",
}

export default function SuggestionsClient({ suggestions: initial, schoolId }: { suggestions: Suggestion[]; schoolId: string }) {
  const [suggestions, setSuggestions] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, subject: form.subject, body: form.body, isAnonymous: form.isAnonymous }),
    })
    const s = await res.json()
    setSuggestions(prev => [s, ...prev]); setOpen(false); setForm(emptyForm); setSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Suggestion Box" description={`${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""}`} action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Add Suggestion</button>
      } />
      {suggestions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm"><Lightbulb className="w-10 h-10 text-indigo-300 mb-3" /><h2 className="font-bold text-gray-800 mb-1">No suggestions yet</h2><button onClick={() => setOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Suggestion</button></div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0"><Lightbulb className="w-5 h-5 text-amber-500" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{s.subject}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{s.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {s.isAnon ? "Anonymous" : s.user?.name ?? "Unknown"} · {formatDate(s.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">Submit Suggestion</h2><button onClick={() => setOpen(false)} className="text-gray-400 text-xl">×</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Subject *</label><input className="input" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Improve school library hours" /></div>
              <div><label className="label">Details *</label><textarea className="input min-h-[120px] resize-none" required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></div>
              <div className="flex items-center gap-3"><input type="checkbox" id="anon" checked={form.isAnonymous} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} className="w-4 h-4 accent-indigo-600" /><label htmlFor="anon" className="text-sm text-gray-700">Submit anonymously</label></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Submitting…" : "Submit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
    </div>
  )
}
