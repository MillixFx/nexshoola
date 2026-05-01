"use client"

import { useState } from "react"
import { BedDouble, Plus, Pencil, Trash2, Users } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { cn } from "@/lib/utils"

type Dorm = { id: string; name: string; type: string; capacity: number; warden: string | null; _count: { rooms: number } }

const emptyForm = { name: "", type: "BOYS", capacity: "", warden: "" }
const TYPE_COLORS: Record<string, string> = {
  BOYS: "bg-blue-50 text-blue-700",
  GIRLS: "bg-pink-50 text-pink-700",
  STAFF: "bg-gray-100 text-gray-700",
}

export default function DormitoryClient({ dorms: initial, schoolId }: { dorms: Dorm[]; schoolId: string }) {
  const [dorms, setDorms] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Dorm | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  function openAdd() { setEditing(null); setForm(emptyForm); setOpen(true) }
  function openEdit(d: Dorm) {
    setEditing(d)
    setForm({ name: d.name, type: d.type, capacity: String(d.capacity), warden: d.warden ?? "" })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/dormitory/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        const updated = await res.json()
        setDorms(prev => prev.map(d => d.id === editing.id ? updated : d))
      } else {
        const res = await fetch("/api/dormitory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
        const dorm = await res.json()
        setDorms(prev => [...prev, dorm])
      }
      setOpen(false); setForm(emptyForm); setEditing(null)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this hostel? This will also delete all rooms inside.")) return
    setDeleting(id)
    await fetch(`/api/dormitory/${id}`, { method: "DELETE" })
    setDorms(prev => prev.filter(d => d.id !== id))
    setDeleting(null)
  }

  const totalCapacity = dorms.reduce((s, d) => s + d.capacity, 0)
  const totalRooms = dorms.reduce((s, d) => s + d._count.rooms, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dormitory"
        description={`${dorms.length} hostel${dorms.length !== 1 ? "s" : ""} · ${totalCapacity} beds capacity`}
        action={
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus className="w-4 h-4" /> Add Hostel
          </button>
        }
      />

      {/* Stats */}
      {dorms.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Hostels", value: dorms.length, color: "bg-indigo-50 text-indigo-700" },
            { label: "Total Rooms", value: totalRooms, color: "bg-emerald-50 text-emerald-700" },
            { label: "Total Capacity", value: `${totalCapacity} beds`, color: "bg-amber-50 text-amber-700" },
          ].map(s => (
            <div key={s.label} className={cn("rounded-2xl p-4 text-center", s.color)}>
              <p className="text-2xl font-extrabold">{s.value}</p>
              <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {dorms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <BedDouble className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No hostels yet</h2>
          <p className="text-sm text-gray-500 mb-3">Add your first hostel block to start managing dormitories</p>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline">+ Add Hostel</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dorms.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <BedDouble className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{d.name}</h3>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", TYPE_COLORS[d.type] || "bg-gray-100 text-gray-600")}>
                      {d.type === "BOYS" ? "Boys" : d.type === "GIRLS" ? "Girls" : "Staff"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(d.id)} disabled={deleting === d.id} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Warden</span>
                  <span className="font-medium text-gray-900">{d.warden ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Rooms</span>
                  <span className="font-semibold text-indigo-600">{d._count.rooms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Capacity</span>
                  <span className="font-semibold text-gray-900">{d.capacity} beds</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Hostel" : "Add Hostel"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Hostel Name *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Boys Block A" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="BOYS">Boys</option>
                    <option value="GIRLS">Girls</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
                <div><label className="label">Capacity (beds)</label><input className="input" type="number" min="0" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
              </div>
              <div><label className="label">Warden Name</label><input className="input" value={form.warden} onChange={e => setForm(f => ({ ...f, warden: e.target.value }))} placeholder="Mr. Kwame Asante" /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Hostel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
    </div>
  )
}
