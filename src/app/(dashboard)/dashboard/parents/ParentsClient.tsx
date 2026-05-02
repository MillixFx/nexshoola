"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, UserCheck, X } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import { cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type Parent = {
  id: string
  occupation: string | null
  relation: string | null
  address: string | null
  user: { name: string; email: string; phone: string | null; isActive: boolean }
  students: { student: { user: { name: string } } }[]
}

const emptyForm = { name: "", email: "", phone: "", password: "", occupation: "", address: "", relation: "Parent" }

function parentInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function ParentsClient({ parents: initial, schoolId }: { parents: Parent[]; schoolId: string }) {
  const router = useRouter()
  const [parents, setParents] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [profileParent, setProfileParent] = useState<Parent | null>(null)

  function openAdd() { setForm(emptyForm); setError(""); setOpen(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/parents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh(); setOpen(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  function handleDelete(id: string) {
    setConfirmModal({
      message: "Delete this parent?",
      onConfirm: async () => {
        await fetch(`/api/parents/${id}`, { method: "DELETE" }).catch(() => {})
        setParents(prev => prev.filter(p => p.id !== id))
      }
    })
  }

  const columns: Column<Parent>[] = [
    {
      key: "user",
      label: "Parent",
      render: p => (
        <button
          type="button"
          onClick={() => setProfileParent(p)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
        >
          <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold text-xs shrink-0">
            {parentInitials(p.user.name)}
          </div>
          <div>
            <p className="font-medium text-gray-900 hover:text-indigo-600 transition-colors">{p.user.name}</p>
            <p className="text-xs text-gray-400">{p.user.email}</p>
          </div>
        </button>
      ),
    },
    { key: "relation", label: "Relation", render: p => p.relation ?? "Parent" },
    { key: "occupation", label: "Occupation", render: p => p.occupation ?? "—" },
    { key: "phone", label: "Phone", render: p => p.user.phone ?? "—" },
    { key: "students", label: "Children", render: p => p.students.length > 0 ? p.students.map(c => c.student.user.name).join(", ") : <span className="text-gray-400">None linked</span> },
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

      {/* ── Add Parent Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Parent</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div><label className="label">Full Name *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mrs. Adwoa Mensah" /></div>
              <div><label className="label">Phone *</label><input className="input" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0241234567" /></div>
              <div><label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="parent@email.com" /></div>
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

      {/* ── Profile Modal */}
      {profileParent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Parent Profile</h2>
              <button onClick={() => setProfileParent(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Avatar + basic info */}
              <div className="flex flex-col items-center gap-3 pb-5 border-b border-gray-100">
                <div className="w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-700 font-extrabold text-2xl shrink-0">
                  {parentInitials(profileParent.user.name)}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900">{profileParent.user.name}</h3>
                  <span className={cn(
                    "inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full",
                    "bg-sky-50 text-sky-700"
                  )}>
                    {profileParent.relation ?? "Parent"}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {profileParent.occupation && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-24 shrink-0 pt-0.5">Occupation</span>
                    <span className="text-sm text-gray-800">{profileParent.occupation}</span>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span className="text-xs font-semibold text-gray-500 w-24 shrink-0 pt-0.5">Email</span>
                  <span className="text-sm text-gray-800 break-all">{profileParent.user.email}</span>
                </div>
                {profileParent.user.phone && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-24 shrink-0 pt-0.5">Phone</span>
                    <span className="text-sm text-gray-800">{profileParent.user.phone}</span>
                  </div>
                )}
                {profileParent.address && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-24 shrink-0 pt-0.5">Address</span>
                    <span className="text-sm text-gray-800">{profileParent.address}</span>
                  </div>
                )}
              </div>

              {/* Wards */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Wards at this school
                </p>
                {profileParent.students.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No wards linked yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {profileParent.students.map((sp, idx) => {
                      const sName = sp.student.user.name
                      const sInitials = sName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      return (
                        <li key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                            {sInitials}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{sName}</p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
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
