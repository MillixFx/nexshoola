"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import { cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type Subject = { id: string; title: string; code: string | null; isOptional: boolean; group: string | null; bookTitle: string | null; bookWriter: string | null }
const GROUPS = ["SCIENCE", "BUSINESS", "ARTS", "GENERAL"]
const emptyForm = { title: "", code: "", isOptional: false, group: "", bookTitle: "", bookWriter: "" }

export default function SubjectsClient({ subjects: initial, schoolId }: { subjects: Subject[]; schoolId: string }) {
  const [subjects, setSubjects] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  function openAdd() { setEditing(null); setForm(emptyForm); setError(""); setOpen(true) }
  function openEdit(s: Subject) { setEditing(s); setForm({ title: s.title, code: s.code ?? "", isOptional: s.isOptional, group: s.group ?? "", bookTitle: s.bookTitle ?? "", bookWriter: s.bookWriter ?? "" }); setError(""); setOpen(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      if (editing) {
        const res = await fetch(`/api/subjects/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setSubjects(prev => prev.map(s => s.id === editing.id ? updated : s))
      } else {
        const res = await fetch("/api/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
        if (!res.ok) throw new Error((await res.json()).error)
        const created = await res.json()
        setSubjects(prev => [...prev, created])
      }
      setOpen(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  function handleDelete(id: string) {
    setConfirmModal({
      message: "Delete this subject?",
      onConfirm: async () => {
        await fetch(`/api/subjects/${id}`, { method: "DELETE" })
        setSubjects(prev => prev.filter(s => s.id !== id))
      }
    })
  }

  const columns: Column<Subject>[] = [
    { key: "title", label: "Subject", primary: true, render: s => <span className="font-medium text-gray-900">{s.title}</span> },
    { key: "code", label: "Code", render: s => s.code ?? "—" },
    { key: "group", label: "Group", render: s => s.group ? <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{s.group}</span> : "—" },
    { key: "bookTitle", label: "Textbook", render: s => s.bookTitle ? `${s.bookTitle}${s.bookWriter ? ` — ${s.bookWriter}` : ""}` : "—" },
    { key: "isOptional", label: "Type", render: s => <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", s.isOptional ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{s.isOptional ? "Elective" : "Core"}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Subjects" description={`${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`} action={
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Add Subject</button>
      } />
      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <BookOpen className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No subjects yet</h2>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Subject</button>
        </div>
      ) : (
        <DataTable columns={columns} data={subjects} keyField="id" viewKey="subjects" searchPlaceholder="Search subjects…" searchKeys={["title", "code"]} actions={(s) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )} />
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Subject" : "Add Subject"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div><label className="label">Subject Title *</label><input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Mathematics" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Code</label><input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MATH" /></div>
                <div><label className="label">Group</label><select className="input" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}><option value="">— None —</option>{GROUPS.map(g => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}</select></div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isOptional" checked={form.isOptional} onChange={e => setForm(f => ({ ...f, isOptional: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="isOptional" className="text-sm text-gray-700">Elective / Optional subject</label>
              </div>
              <div><label className="label">Textbook Title</label><input className="input" value={form.bookTitle} onChange={e => setForm(f => ({ ...f, bookTitle: e.target.value }))} placeholder="New General Mathematics" /></div>
              <div><label className="label">Author</label><input className="input" value={form.bookWriter} onChange={e => setForm(f => ({ ...f, bookWriter: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : editing ? "Update" : "Add Subject"}</button>
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
