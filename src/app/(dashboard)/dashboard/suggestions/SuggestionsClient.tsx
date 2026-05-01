"use client"

import { useState } from "react"
import { Lightbulb, Plus, Check, X, Eye } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatDate, cn } from "@/lib/utils"

type Suggestion = { id: string; subject: string; body: string; isAnon: boolean; status: string; createdAt: string | Date; user: { name: string; role: string } | null }
const emptyForm = { subject: "", body: "", isAnonymous: false }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:     { label: "Pending",     color: "bg-amber-50 text-amber-700 border-amber-200" },
  REVIEWED:    { label: "Reviewed",    color: "bg-blue-50 text-blue-700 border-blue-200" },
  IMPLEMENTED: { label: "Implemented", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED:    { label: "Rejected",    color: "bg-red-50 text-red-600 border-red-200" },
}
const FILTERS = ["ALL", "PENDING", "REVIEWED", "IMPLEMENTED", "REJECTED"] as const

export default function SuggestionsClient({ suggestions: initial, schoolId }: { suggestions: Suggestion[]; schoolId: string }) {
  const [suggestions, setSuggestions] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<typeof FILTERS[number]>("ALL")
  const [updating, setUpdating] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, subject: form.subject, body: form.body, isAnonymous: form.isAnonymous }),
      })
      const s = await res.json()
      setSuggestions(prev => [s, ...prev])
      setOpen(false); setForm(emptyForm)
    } finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    try {
      const res = await fetch("/api/suggestions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
      const updated = await res.json()
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: updated.status } : s))
    } finally { setUpdating(null) }
  }

  const filtered = suggestions.filter(s => filter === "ALL" || s.status === filter)
  const counts = FILTERS.reduce((acc, f) => ({ ...acc, [f]: f === "ALL" ? suggestions.length : suggestions.filter(s => s.status === f).length }), {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suggestion Box"
        description={`${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""} submitted`}
        action={
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus className="w-4 h-4" /> Submit Suggestion
          </button>
        }
      />

      {/* Filter tabs */}
      {suggestions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
                filter === f ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              )}
            >
              {f === "ALL" ? "All" : STATUS_CONFIG[f].label} ({counts[f]})
            </button>
          ))}
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <Lightbulb className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No suggestions yet</h2>
          <p className="text-sm text-gray-500 mb-3">Staff and students can submit ideas to improve the school</p>
          <button onClick={() => setOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline">+ Submit Suggestion</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">No suggestions with this status.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.PENDING
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h3 className="font-bold text-gray-900">{s.subject}</h3>
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0", cfg.color)}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{s.body}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-gray-400">
                        {s.isAnon ? "Anonymous" : s.user?.name ?? "Unknown"} · {formatDate(s.createdAt)}
                      </p>
                      {/* Admin actions */}
                      {s.status === "PENDING" && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => updateStatus(s.id, "REVIEWED")}
                            disabled={updating === s.id}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                          >
                            <Eye className="w-3 h-3" /> Review
                          </button>
                          <button
                            onClick={() => updateStatus(s.id, "REJECTED")}
                            disabled={updating === s.id}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}
                      {s.status === "REVIEWED" && (
                        <button
                          onClick={() => updateStatus(s.id, "IMPLEMENTED")}
                          disabled={updating === s.id}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" /> Mark Implemented
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Submit a Suggestion</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Subject *</label><input className="input" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Improve school library hours" /></div>
              <div><label className="label">Details *</label><textarea className="input min-h-[120px] resize-none" required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Describe your suggestion in detail…" /></div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                <span className="text-sm text-gray-700">Submit anonymously</span>
              </label>
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
