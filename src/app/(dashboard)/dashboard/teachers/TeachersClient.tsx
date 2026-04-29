"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import { cn } from "@/lib/utils"

type Teacher = {
  id: string
  teacherId: string | null
  qualification: string | null
  designation: string | null
  department: string | null
  gender: string | null
  joiningDate: string | Date | null
  user: { name: string; email: string; phone: string | null; isActive: boolean }
}

const emptyForm = { name: "", email: "", phone: "", password: "", teacherId: "", qualification: "", designation: "", department: "", joiningDate: "", gender: "", address: "" }

export default function TeachersClient({ teachers: initial, schoolId }: { teachers: Teacher[]; schoolId: string }) {
  const router = useRouter()
  const [teachers, setTeachers] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function openAdd() { setEditing(null); setForm(emptyForm); setError(""); setOpen(true) }
  function openEdit(t: Teacher) {
    setEditing(t)
    setForm({ name: t.user.name, email: t.user.email, phone: t.user.phone ?? "", password: "", teacherId: t.teacherId ?? "", qualification: t.qualification ?? "", designation: t.designation ?? "", department: t.department ?? "", joiningDate: "", gender: t.gender ?? "", address: "" })
    setError(""); setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      if (editing) {
        const res = await fetch(`/api/teachers/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, isActive: true }) })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setTeachers(prev => prev.map(t => t.id === editing.id ? updated : t))
      } else {
        const res = await fetch("/api/teachers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
        if (!res.ok) throw new Error((await res.json()).error)
        router.refresh(); setOpen(false); return
      }
      setOpen(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this teacher?")) return
    await fetch(`/api/teachers/${id}`, { method: "DELETE" })
    setTeachers(prev => prev.filter(t => t.id !== id))
  }

  const columns: Column<Teacher>[] = [
    { key: "user", label: "Teacher", render: t => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
          {t.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div>
          <p className="font-medium text-gray-900">{t.user.name}</p>
          <p className="text-xs text-gray-400">{t.user.email}</p>
        </div>
      </div>
    )},
    { key: "designation", label: "Designation", render: t => t.designation ?? "—" },
    { key: "department", label: "Department", render: t => t.department ?? "—" },
    { key: "qualification", label: "Qualification", render: t => t.qualification ?? "—" },
    { key: "phone", label: "Phone", render: t => t.user.phone ?? "—" },
    { key: "isActive", label: "Status", render: t => (
      <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full", t.user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
        <span className={cn("w-1.5 h-1.5 rounded-full", t.user.isActive ? "bg-emerald-500" : "bg-red-400")} />
        {t.user.isActive ? "Active" : "Inactive"}
      </span>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Teachers" description={`${teachers.length} teacher${teachers.length !== 1 ? "s" : ""}`} action={
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" /> Add Teacher
        </button>
      } />

      {teachers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4"><GraduationCap className="w-7 h-7 text-emerald-400" /></div>
          <h2 className="text-base font-bold text-gray-800 mb-1">No teachers yet</h2>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Teacher</button>
        </div>
      ) : (
        <DataTable columns={columns} data={teachers} keyField="id" searchPlaceholder="Search teachers…" searchKeys={["user"] as any} actions={(t) => (
          <div className="flex gap-1 justify-end">
            <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )} />
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Teacher" : "Add Teacher"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="label">Full Name *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mr. Kofi Mensah" /></div>
                <div><label className="label">Email *</label><input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                {!editing && <div className="col-span-2"><label className="label">Password (default: changeme123)</label><input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>}
                <div><label className="label">Teacher ID</label><input className="input" value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))} placeholder="TCH-001" /></div>
                <div><label className="label">Gender</label><select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}><option value="">— Select —</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select></div>
                <div><label className="label">Designation</label><input className="input" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="Senior Teacher" /></div>
                <div><label className="label">Department</label><input className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Science" /></div>
                <div className="col-span-2"><label className="label">Qualification</label><input className="input" value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} placeholder="B.Ed. Mathematics" /></div>
                <div><label className="label">Joining Date</label><input className="input" type="date" value={form.joiningDate} onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} /></div>
                <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : editing ? "Update" : "Add Teacher"}</button>
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
