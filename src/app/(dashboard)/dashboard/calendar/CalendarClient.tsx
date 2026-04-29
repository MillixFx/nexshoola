"use client"

import { useState } from "react"
import { Calendar, Plus, Trash2 } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatDate, cn } from "@/lib/utils"

type Event = { id: string; title: string; description: string | null; startDate: string | Date; endDate: string | Date | null; type: string | null; color: string | null }
const EVENT_TYPES = ["HOLIDAY", "EXAM", "SPORTS", "CULTURAL", "ACADEMIC", "MEETING", "OTHER"]
const TYPE_COLORS: Record<string, string> = { HOLIDAY: "bg-red-50 text-red-700", EXAM: "bg-purple-50 text-purple-700", SPORTS: "bg-emerald-50 text-emerald-700", CULTURAL: "bg-orange-50 text-orange-700", ACADEMIC: "bg-blue-50 text-blue-700", MEETING: "bg-gray-100 text-gray-700", OTHER: "bg-indigo-50 text-indigo-700" }
const emptyForm = { title: "", description: "", startDate: "", endDate: "", type: "OTHER", color: "#6366f1" }

export default function CalendarClient({ events: initial, schoolId }: { events: Event[]; schoolId: string }) {
  const [events, setEvents] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
    const event = await res.json()
    setEvents(prev => [...prev, event].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()))
    setOpen(false); setForm(emptyForm); setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event?")) return
    await fetch(`/api/calendar?id=${id}`, { method: "DELETE" })
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const upcoming = events.filter(e => new Date(e.startDate) >= new Date())
  const past = events.filter(e => new Date(e.startDate) < new Date())

  function EventCard({ event }: { event: Event }) {
    const typeClass = TYPE_COLORS[event.type ?? "OTHER"] || "bg-gray-100 text-gray-600"
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
        <div className="w-12 text-center shrink-0 bg-indigo-600 text-white rounded-xl py-2">
          <p className="text-lg font-bold leading-none">{new Date(event.startDate).getDate()}</p>
          <p className="text-xs opacity-80">{new Date(event.startDate).toLocaleDateString("en", { month: "short" })}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
            {event.type && <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", typeClass)}>{event.type}</span>}
          </div>
          {event.description && <p className="text-sm text-gray-500 truncate">{event.description}</p>}
          {event.endDate && <p className="text-xs text-gray-400 mt-1">Until {formatDate(event.endDate)}</p>}
        </div>
        <button onClick={() => handleDelete(event.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description={`${events.length} event${events.length !== 1 ? "s" : ""}`} action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Add Event</button>
      } />
      {events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm"><Calendar className="w-10 h-10 text-indigo-300 mb-3" /><h2 className="font-bold text-gray-800 mb-1">No events yet</h2><button onClick={() => setOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Event</button></div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h3>
              <div className="space-y-3">{upcoming.map(e => <EventCard key={e.id} event={e} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Past</h3>
              <div className="space-y-3 opacity-60">{past.slice(0, 10).map(e => <EventCard key={e.id} event={e} />)}</div>
            </div>
          )}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">Add Event</h2><button onClick={() => setOpen(false)} className="text-gray-400 text-xl">×</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Event Title *</label><input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Inter-School Sports Day" /></div>
              <div><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><label className="label">Type</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Start Date *</label><input type="date" className="input" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><label className="label">End Date</label><input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Add Event"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
    </div>
  )
}
