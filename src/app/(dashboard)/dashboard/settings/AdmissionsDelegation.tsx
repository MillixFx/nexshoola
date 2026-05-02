"use client"

import { useState } from "react"
import { UserCheck, Trash2, Plus, ShieldCheck } from "lucide-react"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type StaffItem = { userId: string; name: string; email: string; role: string }
type Delegee   = { id: string; userId: string; user: { id: string; name: string; email: string; role: string } }

interface Props {
  staff:    StaffItem[]
  delegees: Delegee[]
}

const ROLE_LABELS: Record<string, string> = {
  TEACHER: "Teacher", ADMIN: "Admin", HEADMASTER: "Headmaster",
  ACCOUNTANT: "Accountant", LIBRARIAN: "Librarian",
  HOSTEL_MANAGER: "Hostel Mgr", HR: "HR", DRIVER: "Driver",
}

export default function AdmissionsDelegation({ staff, delegees: initial }: Props) {
  const [delegees, setDelegees] = useState(initial)
  const [selected,  setSelected] = useState("")
  const [saving,    setSaving]   = useState(false)
  const [error,     setError]    = useState("")
  const [toRemove,  setToRemove] = useState<Delegee | null>(null)

  // Exclude already-delegated users and ADMIN/HEADMASTER (they have it by default)
  const delegeeUserIds = new Set(delegees.map(d => d.userId))
  const available = staff.filter(
    s => !delegeeUserIds.has(s.userId) && s.role !== "ADMIN" && s.role !== "HEADMASTER"
  )

  async function grantAccess() {
    if (!selected) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/admissions-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const newPerm = await res.json()
      setDelegees(prev => [...prev, newPerm])
      setSelected("")
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  async function revokeAccess(d: Delegee) {
    await fetch(`/api/admissions-access?userId=${d.userId}`, { method: "DELETE" })
    setDelegees(prev => prev.filter(p => p.userId !== d.userId))
    setToRemove(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-4.5 h-4.5 w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Admissions Delegation</h2>
          <p className="text-xs text-gray-500">Grant staff permission to register new students</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
        <strong>Admin</strong> and <strong>Headmaster</strong> always have admission rights.
        Use this to delegate to other staff members when needed.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Current delegees */}
      {delegees.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No staff delegated yet.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Currently Delegated</p>
          {delegees.map(d => (
            <div key={d.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                {d.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{d.user.name}</p>
                <p className="text-xs text-gray-500">{d.user.email} · {ROLE_LABELS[d.user.role] ?? d.user.role}</p>
              </div>
              <button
                onClick={() => setToRemove(d)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="Revoke access"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Grant access */}
      <div className="pt-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Grant Access</p>
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Select staff member —</option>
            {available.map(s => (
              <option key={s.userId} value={s.userId}>
                {s.name} ({ROLE_LABELS[s.role] ?? s.role})
              </option>
            ))}
          </select>
          <button
            onClick={grantAccess}
            disabled={!selected || saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {saving ? "Granting…" : "Grant"}
          </button>
        </div>
        {available.length === 0 && (
          <p className="text-xs text-gray-400 mt-2">All eligible staff have been delegated.</p>
        )}
      </div>

      <ConfirmModal
        open={!!toRemove}
        message={toRemove ? `Revoke admissions access from ${toRemove.user.name}?` : ""}
        onConfirm={() => toRemove && revokeAccess(toRemove)}
        onCancel={() => setToRemove(null)}
      />
    </div>
  )
}
