"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, UserCheck, X, Link, Unlink, Search } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import { cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type StudentSnap = { id: string; user: { name: string }; class?: { name: string; section: string | null } | null }
type StudentParentLink = { student: { id: string; user: { name: string } } }

type Parent = {
  id: string
  occupation: string | null
  relation: string | null
  address: string | null
  user: { name: string; email: string; phone: string | null; isActive: boolean }
  students: StudentParentLink[]
}

const emptyForm = { name: "", email: "", phone: "", password: "", occupation: "", address: "", relation: "Parent" }

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function ParentsClient({
  parents: initial,
  students: allStudents,
  schoolId,
}: {
  parents: Parent[]
  students: StudentSnap[]
  schoolId: string
}) {
  const router = useRouter()
  const [parents, setParents] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [profileParent, setProfileParent] = useState<Parent | null>(null)

  // Link ward modal
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkSearch, setLinkSearch] = useState("")
  const [linkSaving, setLinkSaving] = useState("")

  function openAdd() { setForm(emptyForm); setError(""); setOpen(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create parent")
      router.refresh(); setOpen(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  function handleDelete(id: string, name: string) {
    setConfirmModal({
      message: `Delete ${name}? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/parents/${id}`, { method: "DELETE" })
          if (!res.ok) {
            const d = await res.json()
            alert(d.error || "Failed to delete")
            return
          }
          setParents(prev => prev.filter(p => p.id !== id))
          if (profileParent?.id === id) setProfileParent(null)
        } catch {
          alert("Failed to delete parent")
        }
      },
    })
  }

  // Link / unlink a student to the currently viewed parent
  async function handleLink(studentId: string, action: "link" | "unlink") {
    if (!profileParent) return
    setLinkSaving(studentId)
    try {
      const res = await fetch(`/api/parents/${profileParent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, studentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Update local state with the returned parent data
      setProfileParent(data)
      setParents(prev => prev.map(p => p.id === data.id ? data : p))
    } catch (err: any) {
      alert(err.message || "Failed to update link")
    } finally { setLinkSaving("") }
  }

  // Students not yet linked to this parent
  const unlinkedStudents = useMemo(() => {
    if (!profileParent) return []
    const linked = new Set(profileParent.students.map(s => s.student.id))
    return allStudents.filter(s => !linked.has(s.id))
  }, [profileParent, allStudents])

  const filteredUnlinked = useMemo(() => {
    if (!linkSearch.trim()) return unlinkedStudents
    const q = linkSearch.toLowerCase()
    return unlinkedStudents.filter(s => s.user.name.toLowerCase().includes(q))
  }, [unlinkedStudents, linkSearch])

  const columns: Column<Parent>[] = [
    {
      key: "user",
      label: "Parent",
      primary: true,
      render: p => (
        <button
          type="button"
          onClick={() => { setProfileParent(p); setLinkSearch("") }}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
        >
          <div className="w-9 h-9 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
            {initials(p.user.name)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 hover:text-sky-700 transition-colors">{p.user.name}</p>
            <p className="text-xs text-gray-400">{p.user.email}</p>
          </div>
        </button>
      ),
    },
    { key: "relation", label: "Relation", render: p => <span className="text-sm text-gray-600">{p.relation ?? "Parent"}</span> },
    { key: "occupation", label: "Occupation", render: p => <span className="text-sm text-gray-500">{p.occupation ?? "—"}</span> },
    { key: "phone", label: "Phone", render: p => <span className="text-sm text-gray-600">{p.user.phone ?? "—"}</span> },
    {
      key: "students",
      label: "Wards",
      render: p => p.students.length > 0
        ? <span className="text-sm text-sky-700 font-medium">{p.students.map(c => c.student.user.name).join(", ")}</span>
        : <span className="text-xs text-gray-400 italic">None linked</span>,
    },
    {
      key: "isActive",
      label: "Status",
      render: p => (
        <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full",
          p.user.isActive ? "bg-sky-50 text-sky-700" : "bg-red-50 text-red-600")}>
          {p.user.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parents"
        description={`${parents.length} parent${parents.length !== 1 ? "s" : ""} registered`}
        action={
          <button onClick={openAdd} className="flex items-center gap-2 bg-sky-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-sky-700 shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Parent
          </button>
        }
      />

      {parents.length === 0 ? (
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl border border-sky-100 p-14 flex flex-col items-center text-center shadow-sm">
          <UserCheck className="w-12 h-12 text-sky-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No parents yet</h2>
          <p className="text-sm text-gray-500 mb-4">Add a parent to get started</p>
          <button onClick={openAdd} className="text-sm font-semibold text-sky-600 hover:underline">+ Add Parent</button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={parents}
          keyField="id"
          viewKey="parents"
          searchPlaceholder="Search parents…"
          searchKeys={["user"] as any}
          actions={(p) => (
            <div className="flex gap-1 justify-end">
              <button
                onClick={() => { setProfileParent(p); setLinkSearch("") }}
                className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                title="View profile & manage wards"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(p.id, p.user.name)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete parent"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        />
      )}

      {/* ── Add Parent Modal ───────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Parent</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
              )}
              <div>
                <label className="label">Full Name *</label>
                <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mrs. Adwoa Mensah" />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input className="input" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0241234567" />
              </div>
              <div>
                <label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="parent@email.com" />
              </div>
              <div>
                <label className="label">Relation to Student</label>
                <input className="input" value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))} placeholder="Mother, Father, Guardian…" />
              </div>
              <div>
                <label className="label">Occupation</label>
                <input className="input" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 disabled:opacity-60 transition-colors">
                  {saving ? "Saving…" : "Add Parent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Profile + Wards Modal ──────────────────────────────────────── */}
      {profileParent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Parent Profile</h2>
              <button onClick={() => setProfileParent(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar + basic info */}
              <div className="flex flex-col items-center gap-3 pb-5 border-b border-gray-100">
                <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">
                  {initials(profileParent.user.name)}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900">{profileParent.user.name}</h3>
                  <span className="inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-700">
                    {profileParent.relation ?? "Parent"}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-sky-50 rounded-xl p-3">
                  <p className="text-xs text-sky-600 font-semibold mb-0.5">Email</p>
                  <p className="text-gray-800 break-all text-xs">{profileParent.user.email}</p>
                </div>
                {profileParent.user.phone && (
                  <div className="bg-sky-50 rounded-xl p-3">
                    <p className="text-xs text-sky-600 font-semibold mb-0.5">Phone</p>
                    <p className="text-gray-800">{profileParent.user.phone}</p>
                  </div>
                )}
                {profileParent.occupation && (
                  <div className="bg-sky-50 rounded-xl p-3">
                    <p className="text-xs text-sky-600 font-semibold mb-0.5">Occupation</p>
                    <p className="text-gray-800">{profileParent.occupation}</p>
                  </div>
                )}
                {profileParent.address && (
                  <div className="bg-sky-50 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-sky-600 font-semibold mb-0.5">Address</p>
                    <p className="text-gray-800">{profileParent.address}</p>
                  </div>
                )}
              </div>

              {/* Linked Wards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    Linked Wards ({profileParent.students.length})
                  </p>
                  {unlinkedStudents.length > 0 && (
                    <button
                      onClick={() => setLinkOpen(v => !v)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Link className="w-3.5 h-3.5" />
                      Link Ward
                    </button>
                  )}
                </div>

                {profileParent.students.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-3">No wards linked yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {profileParent.students.map((sp, idx) => {
                      const sName = sp.student.user.name
                      return (
                        <li key={idx} className="flex items-center justify-between gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {initials(sName)}
                            </div>
                            <p className="text-sm font-medium text-gray-900">{sName}</p>
                          </div>
                          <button
                            onClick={() => handleLink(sp.student.id, "unlink")}
                            disabled={linkSaving === sp.student.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Unlink ward"
                          >
                            {linkSaving === sp.student.id ? (
                              <span className="text-xs">…</span>
                            ) : (
                              <Unlink className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Link Ward panel */}
                {linkOpen && unlinkedStudents.length > 0 && (
                  <div className="mt-4 border border-sky-200 rounded-xl overflow-hidden">
                    <div className="bg-sky-50 px-4 py-2.5 flex items-center gap-2 border-b border-sky-200">
                      <Search className="w-4 h-4 text-sky-500" />
                      <input
                        autoFocus
                        className="flex-1 bg-transparent text-sm outline-none placeholder-sky-400"
                        placeholder="Search student name…"
                        value={linkSearch}
                        onChange={e => setLinkSearch(e.target.value)}
                      />
                    </div>
                    <ul className="max-h-52 overflow-y-auto divide-y divide-sky-100">
                      {filteredUnlinked.length === 0 ? (
                        <li className="p-3 text-sm text-gray-400 text-center">No students found</li>
                      ) : filteredUnlinked.map(s => (
                        <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-sky-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                              {initials(s.user.name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{s.user.name}</p>
                              {s.class && <p className="text-xs text-gray-400">{s.class.name}{s.class.section ? ` — ${s.class.section}` : ""}</p>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleLink(s.id, "link")}
                            disabled={linkSaving === s.id}
                            className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-white hover:bg-sky-600 border border-sky-300 hover:border-sky-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {linkSaving === s.id ? "Linking…" : <><Link className="w-3 h-3" /> Link</>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Delete button */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleDelete(profileParent.id, profileParent.user.name)}
                  className="w-full py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
                >
                  Delete Parent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display:block; font-size:0.75rem; font-weight:600; color:#374151; margin-bottom:0.375rem; }
        .input { width:100%; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0.625rem 0.875rem; font-size:0.875rem; outline:none; transition: border-color 0.15s, box-shadow 0.15s; }
        .input:focus { outline:none; border-color:#0ea5e9; box-shadow:0 0 0 3px rgba(14,165,233,0.15); }
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
