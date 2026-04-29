"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, UserCheck } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import { cn } from "@/lib/utils"

type Parent = {
  id: string; occupation: string | null; relation: string | null; address: string | null
  user: { name: string; email: string; phone: string | null; isActive: boolean }
  children: { student: { user: { name: string } } }[]
}

const emptyForm = { name: "", email: "", phone: "", password: "", occupation: "", address: "", relation: "Parent" }

export default function ParentsClient({ parents: initial, schoolId }: { parents: Parent[]; schoolId: string }) {
  const router = useRouter()
  const [parents, setParents] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Parent | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function openAdd() { setEditing(null); setForm(emptyForm); setError(""); setOpen(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/parents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh(); setOpen(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this parent?")) return
    await fetch(`/api/parents/${id}`, { method: "DELETE" }).catch(() => {})
    setParents(prev => prev.filter(p => p.id !== id))
  }

  const columns: Column<Parent>[] = [
    { key: "user", label: "Parent", render: p => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold text-xs shrink-0">
          {p.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div><p className="font-medium text-gray-900">{p.user.name}</p><p className="text-xs text-gray-400">{p.user.email}</p></div>
      </div>
    )},
    { key: "relation", label: "Relation", render: p => p.relation ?? "Parent" },
    { key: "occupation", label: "Occupation", render: p => p.occupation ?? "—" },
    { key: "phone", label: "Phone", render: p => p.user.phone ?? "—" },
    { key: "children", label: "Children", render: p => p.children.length > 0 ? p.children.map(c => c.student.user.name).join(", ") : <span className="text-gray-400">None linked</span> },
    { key: "isActive", label: "Status", render: p => <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", p.user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>{p.user.isActive ? "Active" : "Inactive"}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Parents" description={`${parents.length} parent${parents.length !== 1 ? "s" : ""} registered`} action={
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Add Parent</button>
      } />
      {parents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <UserCheck className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No parents yet</h2>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Parent</button>
        </div>
      ) : (
        <DataTable columns={columns} data={parents} keyField="id" searchPlaceholder="Search parents…" searchKeys={["user"] as any} actions={(p) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )} />
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Parent</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div><label className="label">Full Name *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mrs. Adwoa Mensah" /></div>
              <div><label className="label">Email *</label><input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="label">Relation to Student</label><input className="input" value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} placeholder="Mother, Father, Guardian…" /></div>
              <div><label className="label">Occupation</label><input className="input" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} /></div>
              <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Add Parent"}</button>
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
