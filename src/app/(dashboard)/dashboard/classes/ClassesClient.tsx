"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type ClassWithCount = {
  id: string
  name: string
  section: string | null
  code: string | null
  capacity: number | null
  _count: { students: number }
}

const emptyForm = { name: "", section: "", code: "", capacity: "" }

export default function ClassesClient({ classes: initial, schoolId }: { classes: ClassWithCount[]; schoolId: string }) {
  const router = useRouter()
  const [classes, setClasses] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ClassWithCount | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  function openAdd() { setEditing(null); setForm(emptyForm); setError(""); setOpen(true) }
  function openEdit(c: ClassWithCount) {
    setEditing(c)
    setForm({ name: c.name, section: c.section ?? "", code: c.code ?? "", capacity: c.capacity ? String(c.capacity) : "" })
    setError(""); setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      if (editing) {
        const res = await fetch(`/api/classes/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setClasses(prev => prev.map(c => c.id === editing.id ? updated : c))
      } else {
        const res = await fetch("/api/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
        if (!res.ok) throw new Error((await res.json()).error)
        const created = await res.json()
        setClasses(prev => [...prev, created])
      }
      setOpen(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  function handleDelete(id: string) {
    setConfirmModal({
      message: "Delete this class?",
      onConfirm: async () => {
        await fetch(`/api/classes/${id}`, { method: "DELETE" })
        setClasses(prev => prev.filter(c => c.id !== id))
      }
    })
  }

  const columns: Column<ClassWithCount>[] = [
    { key: "name", label: "Class Name", render: c => <span className="font-medium text-gray-900">{c.name}{c.section ? ` — ${c.section}` : ""}</span> },
    { key: "code", label: "Code", render: c => c.code ?? "—" },
    {
      key: "students",
      label: "Enrollment",
      render: c => {
        const count = c._count.students
        const cap = c.capacity
        if (!cap) return <span className="font-semibold text-indigo-600">{count} enrolled</span>
        const pct = Math.min(100, Math.round((count / cap) * 100))
        const color = pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-amber-400" : "bg-emerald-500"
        const textColor = pct >= 100 ? "text-red-600" : pct >= 85 ? "text-amber-600" : "text-emerald-600"
        return (
          <div className="min-w-[120px]">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold ${textColor}`}>{count} / {cap}</span>
              <span className="text-[10px] text-gray-400">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description={`${classes.length} class${classes.length !== 1 ? "es" : ""}`}
        action={
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Class
          </button>
        }
      />

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4"><BookOpen className="w-7 h-7 text-indigo-400" /></div>
          <h2 className="text-base font-bold text-gray-800 mb-1">No classes yet</h2>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Class</button>
        </div>
      ) : (
        <DataTable columns={columns} data={classes} keyField="id" searchPlaceholder="Search classes…" searchKeys={["name", "code"]} actions={(c) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )} />
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Class" : "Add Class"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div>
                <label className="label">Class Name *</label>
                <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="JHS 1" />
              </div>
              <div>
                <label className="label">Section / Arm</label>
                <input className="input" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="A, B, Gold…" />
              </div>
              <div>
                <label className="label">Class Code</label>
                <input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="JHS1A" />
              </div>
              <div>
                <label className="label">Capacity</label>
                <input className="input" type="number" min="0" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="40" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : editing ? "Update" : "Add Class"}</button>
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
      <ConfirmModal
        open={!!confirmModal}
        message={confirmModal?.message ?? ""}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null) }}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  )
}
