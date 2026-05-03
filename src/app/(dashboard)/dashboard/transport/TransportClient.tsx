"use client"

import { useState, useEffect } from "react"
import { Bus, Plus, Pencil, Trash2, Users, X, Loader2, UserPlus, MapPin } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatCurrency, cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type Route = {
  id: string
  routeName: string | null
  vehicleNo: string | null
  vehicleModel: string | null
  driverName: string | null
  driverPhone: string | null
  capacity: number | null
  fare: number | null
}

type StudentOption = {
  id: string
  name: string
  className: string | null
  currentTransportId: string | null
}

type Assignment = {
  id: string
  studentId: string
  pickupPoint: string | null
  student: {
    user: { name: string; email: string }
    class: { name: string; section: string | null } | null
  }
}

const emptyForm = {
  routeName: "", vehicleNo: "", vehicleModel: "",
  driverName: "", driverPhone: "", capacity: "", fare: "",
}

export default function TransportClient({
  routes: initial,
  students,
  schoolId,
}: {
  routes: Route[]
  students: StudentOption[]
  schoolId: string
}) {
  const [routes, setRoutes] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Route | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // Students panel
  const [studentsPanel, setStudentsPanel] = useState<Route | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [panelLoading, setPanelLoading] = useState(false)
  const [assignStudentId, setAssignStudentId] = useState("")
  const [assignPickup, setAssignPickup] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState("")

  function openAdd() { setEditing(null); setForm(emptyForm); setOpen(true) }
  function openEdit(r: Route) {
    setEditing(r)
    setForm({
      routeName: r.routeName ?? "",
      vehicleNo: r.vehicleNo ?? "",
      vehicleModel: r.vehicleModel ?? "",
      driverName: r.driverName ?? "",
      driverPhone: r.driverPhone ?? "",
      capacity: String(r.capacity ?? ""),
      fare: String(r.fare ?? ""),
    })
    setOpen(true)
  }

  function openStudentsPanel(r: Route) {
    setStudentsPanel(r)
    setAssignStudentId("")
    setAssignPickup("")
    setAssignError("")
    loadAssignments(r.id)
  }

  async function loadAssignments(routeId: string) {
    setPanelLoading(true)
    try {
      const res = await fetch(`/api/transport/${routeId}/students`)
      const data = await res.json()
      setAssignments(data)
    } finally {
      setPanelLoading(false)
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!studentsPanel || !assignStudentId) return
    setAssigning(true)
    setAssignError("")
    try {
      const res = await fetch(`/api/transport/${studentsPanel.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: assignStudentId, pickupPoint: assignPickup }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "Failed to assign")
      }
      await loadAssignments(studentsPanel.id)
      setAssignStudentId("")
      setAssignPickup("")
    } catch (err: any) {
      setAssignError(err.message)
    } finally {
      setAssigning(false)
    }
  }

  async function handleRemoveAssignment(studentId: string) {
    if (!studentsPanel) return
    await fetch(`/api/transport/${studentsPanel.id}/students?studentId=${studentId}`, { method: "DELETE" })
    setAssignments(prev => prev.filter(a => a.studentId !== studentId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/transport/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        const updated = await res.json()
        setRoutes(prev => prev.map(r => r.id === editing.id ? updated : r))
      } else {
        const res = await fetch("/api/transport", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, schoolId }),
        })
        const route = await res.json()
        setRoutes(prev => [...prev, route])
      }
      setOpen(false)
      setForm(emptyForm)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(id: string) {
    setConfirmModal({
      message: "Delete this route?",
      onConfirm: async () => {
        await fetch(`/api/transport/${id}`, { method: "DELETE" })
        setRoutes(prev => prev.filter(r => r.id !== id))
      },
    })
  }

  const filtered = routes.filter(r =>
    [r.routeName, r.vehicleNo, r.driverName].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  // Students not yet assigned to this route
  const unassignedStudents = studentsPanel
    ? students.filter(s =>
        !assignments.some(a => a.studentId === s.id) &&
        (s.currentTransportId === null || s.currentTransportId === studentsPanel.id)
      )
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport"
        description={`${routes.length} route${routes.length !== 1 ? "s" : ""} registered`}
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Route
          </button>
        }
      />

      {routes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <Bus className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No routes yet</h2>
          <p className="text-sm text-gray-500 mb-3">Add school bus routes and driver details</p>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline">+ Add Route</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input
              className="w-full sm:w-64 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search routes, drivers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Capacity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fare</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                      No routes match your search.
                    </td>
                  </tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                          <Bus className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <span className="font-medium text-gray-900">{r.routeName ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{r.vehicleNo ?? "—"}</p>
                      {r.vehicleModel && <p className="text-xs text-gray-400">{r.vehicleModel}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{r.driverName ?? "—"}</p>
                      {r.driverPhone && <p className="text-xs text-gray-400">{r.driverPhone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.capacity ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.fare ? formatCurrency(r.fare) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openStudentsPanel(r)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Manage students"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            {filtered.length} of {routes.length} routes
          </div>
        </div>
      )}

      {/* ── Add/Edit Route Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Route" : "Add Route"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Route Name *</label>
                <input className="input" required value={form.routeName} onChange={e => setForm(f => ({ ...f, routeName: e.target.value }))} placeholder="Accra — Adenta" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Vehicle Reg. No.</label><input className="input" value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value }))} placeholder="GR-1234-22" /></div>
                <div><label className="label">Vehicle Model</label><input className="input" value={form.vehicleModel} onChange={e => setForm(f => ({ ...f, vehicleModel: e.target.value }))} placeholder="Toyota Hiace" /></div>
                <div><label className="label">Driver Name</label><input className="input" value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} /></div>
                <div><label className="label">Driver Phone</label><input className="input" type="tel" value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} /></div>
                <div><label className="label">Capacity (seats)</label><input className="input" type="number" min="0" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
                <div><label className="label">Term Fare (GH₵)</label><input className="input" type="number" min="0" step="0.01" value={form.fare} onChange={e => setForm(f => ({ ...f, fare: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Students Slide-Over Panel ── */}
      {studentsPanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Route Students</h2>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Bus className="w-3.5 h-3.5" />
                  {studentsPanel.routeName}
                </p>
              </div>
              <button onClick={() => setStudentsPanel(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Assign form */}
            <div className="p-5 border-b border-gray-100 shrink-0">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-500" /> Assign Student
              </h3>
              <form onSubmit={handleAssign} className="space-y-3">
                {assignError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{assignError}</div>
                )}
                <select
                  className="input"
                  value={assignStudentId}
                  onChange={e => setAssignStudentId(e.target.value)}
                  required
                >
                  <option value="">— Select student —</option>
                  {unassignedStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.className ? ` (${s.className})` : ""}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="input pl-8"
                      placeholder="Pickup point (optional)"
                      value={assignPickup}
                      onChange={e => setAssignPickup(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={assigning || !assignStudentId}
                    className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5 shrink-0"
                  >
                    {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Assign
                  </button>
                </div>
              </form>
            </div>

            {/* Assigned students list */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {assignments.length} student{assignments.length !== 1 ? "s" : ""} on this route
                </p>
              </div>

              {panelLoading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No students assigned yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-indigo-600">
                        {a.student.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{a.student.user.name}</p>
                        <p className="text-xs text-gray-400">
                          {a.student.class ? `${a.student.class.name}${a.student.class.section ? ` ${a.student.class.section}` : ""}` : "No class"}
                          {a.pickupPoint ? ` · ${a.pickupPoint}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveAssignment(a.studentId)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="Remove from route"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display: block; font-size: .75rem; font-weight: 500; color: #374151; margin-bottom: .375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: .75rem; padding: .625rem .875rem; font-size: .875rem; outline: none; }
        .input:focus { outline: 2px solid #6366f1; border-color: #6366f1; }
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
