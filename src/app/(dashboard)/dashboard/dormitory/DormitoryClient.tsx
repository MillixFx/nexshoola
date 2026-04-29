"use client"

import { useState } from "react"
import { BedDouble, Plus } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"

type Dorm = { id: string; name: string; type: string | null; capacity: number; warden: string | null; _count: { rooms: number } }
const emptyForm = { name: "", type: "BOYS", capacity: "", warden: "" }

export default function DormitoryClient({ dorms: initial, schoolId }: { dorms: Dorm[]; schoolId: string }) {
  const [dorms, setDorms] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/dormitory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
    const dorm = await res.json()
    setDorms(prev => [...prev, dorm]); setOpen(false); setForm(emptyForm); setSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dormitory" description={`${dorms.length} hostel${dorms.length !== 1 ? "s" : ""}`} action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Add Hostel</button>
      } />
      {dorms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <BedDouble className="w-10 h-10 text-indigo-300 mb-3" /><h2 className="font-bold text-gray-800 mb-1">No hostels yet</h2>
          <button onClick={() => setOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Hostel</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dorms.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center"><BedDouble className="w-5 h-5 text-indigo-500" /></div>
                <div><h3 className="font-bold text-gray-900">{d.name}</h3><p className="text-xs text-gray-400">{d.type}</p></div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Capacity: <span className="font-semibold text-gray-900">{d.capacity}</span></p>
                <p>Warden: <span className="font-semibold text-gray-900">{d.warden ?? "—"}</span></p>
                <p>Rooms: <span className="font-semibold text-indigo-600">{d._count.rooms}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">Add Hostel</h2><button onClick={() => setOpen(false)} className="text-gray-400 text-xl">×</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Hostel Name *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Boys Block A" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Type</label><select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option value="BOYS">Boys</option><option value="GIRLS">Girls</option><option value="MIXED">Mixed</option></select></div>
                <div><label className="label">Capacity</label><input className="input" type="number" min="0" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
              </div>
              <div><label className="label">Warden</label><input className="input" value={form.warden} onChange={e => setForm(f => ({ ...f, warden: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Add Hostel"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
    </div>
  )
}
