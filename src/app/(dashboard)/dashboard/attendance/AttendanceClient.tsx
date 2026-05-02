"use client"

import { useState, useEffect } from "react"
import {
  ClipboardCheck, Check, X, Clock, Minus,
  UserCheck, UserX, AlertTriangle, Loader2, UserCog, CalendarX,
} from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { cn, formatDate } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassInfo = {
  id: string
  name: string
  section: string | null
  classTeacher: { id: string; user: { name: string } } | null
}

type Teacher = { id: string; user: { name: string } }

type AttRecord = {
  id: string; status: string; date: string | Date; note: string | null
  student: { id: string; user: { name: string } }
  class: { name: string; section: string | null } | null
}

type StudentRow = { studentId: string; name: string; status: string; note: string }

type Substitute = {
  id: string
  startDate: string
  endDate: string | null
  note: string | null
  substitute: { id: string; user: { name: string } }
  assignedBy: { id: string; name: string; role: string }
  class: { id: string; name: string; section: string | null }
}

interface Props {
  classes: ClassInfo[]
  recentAttendance: AttRecord[]
  teachers: Teacher[]
  schoolId: string
  currentRole: string
  currentTeacherId: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "PRESENT",  label: "Present",  icon: Check,  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "ABSENT",   label: "Absent",   icon: X,      color: "bg-red-100 text-red-700 border-red-200" },
  { value: "LATE",     label: "Late",     icon: Clock,  color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "EXCUSED",  label: "Excused",  icon: Minus,  color: "bg-gray-100 text-gray-600 border-gray-200" },
]

const ADMIN_ROLES = ["ADMIN", "HEADMASTER", "SUPER_ADMIN"]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendanceClient({
  classes, recentAttendance, teachers, schoolId, currentRole, currentTeacherId,
}: Props) {
  const today = new Date().toISOString().split("T")[0]

  const [tab, setTab]                     = useState<"mark" | "history">("mark")
  const [selectedClass, setSelectedClass] = useState("")
  const [date, setDate]                   = useState(today)
  const [students, setStudents]           = useState<StudentRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)

  // Substitute state
  const [activeSub, setActiveSub]         = useState<Substitute | null>(null)
  const [loadingSub, setLoadingSub]       = useState(false)
  const [subOpen, setSubOpen]             = useState(false)
  const [subForm, setSubForm]             = useState({ substituteId: "", startDate: today, endDate: "", note: "" })
  const [subSaving, setSubSaving]         = useState(false)
  const [subError, setSubError]           = useState("")
  const [confirmModal, setConfirmModal]   = useState<{ message: string; onConfirm: () => void } | null>(null)

  const selectedClassInfo = classes.find(c => c.id === selectedClass) ?? null
  const isAdmin = ADMIN_ROLES.includes(currentRole)
  const isClassMaster = !!currentTeacherId && selectedClassInfo?.classTeacher?.id === currentTeacherId
  const canManageSub = isAdmin || isClassMaster

  // ── Load students when class or date changes ────────────────────────────────
  useEffect(() => {
    if (!selectedClass) { setStudents([]); return }
    setLoadingStudents(true)
    fetch(`/api/attendance?classId=${selectedClass}&date=${date}`)
      .then(r => r.json())
      .then((data: any) => {
        // data.students = [{ studentId, name, status, note }]
        if (data.students) {
          setStudents(data.students)
        } else {
          // Fall back: fetch students by class
          fetch(`/api/students?schoolId=${schoolId}`)
            .then(r => r.json())
            .then((all: any[]) => {
              const cls = selectedClassInfo
              const filtered = all.filter((s: any) =>
                s.class?.name === cls?.name && s.class?.section === cls?.section
              )
              setStudents(filtered.map((s: any) => ({ studentId: s.id, name: s.user.name, status: "PRESENT", note: "" })))
            })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStudents(false))
  }, [selectedClass, date])

  // ── Load active substitute when class or date changes ─────────────────────
  useEffect(() => {
    if (!selectedClass) { setActiveSub(null); return }
    setLoadingSub(true)
    fetch(`/api/substitutes?schoolId=${schoolId}&classId=${selectedClass}&date=${date}`)
      .then(r => r.json())
      .then((data: Substitute[]) => setActiveSub(data[0] ?? null))
      .catch(() => setActiveSub(null))
      .finally(() => setLoadingSub(false))
  }, [selectedClass, date])

  // ── Attendance helpers ─────────────────────────────────────────────────────
  function setStatus(studentId: string, status: string) {
    setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, status } : s))
  }
  function markAll(status: string) {
    setStudents(prev => prev.map(s => ({ ...s, status })))
  }

  async function handleSave() {
    if (!selectedClass || students.length === 0) return
    setSaving(true); setSaved(false)
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId, classId: selectedClass, date,
          records: students.map(s => ({ studentId: s.studentId, status: s.status, note: s.note })),
        }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } finally { setSaving(false) }
  }

  // ── Substitute helpers ─────────────────────────────────────────────────────
  function openSubModal() {
    setSubForm({ substituteId: "", startDate: date, endDate: "", note: "" })
    setSubError(""); setSubOpen(true)
  }

  async function handleAssignSub(e: React.FormEvent) {
    e.preventDefault(); setSubSaving(true); setSubError("")
    try {
      const res = await fetch("/api/substitutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass,
          substituteId: subForm.substituteId,
          startDate: subForm.startDate,
          endDate: subForm.endDate || null,
          note: subForm.note || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const created = await res.json()
      setActiveSub(created)
      setSubOpen(false)
    } catch (err: any) { setSubError(err.message) } finally { setSubSaving(false) }
  }

  function handleEndSub() {
    if (!activeSub) return
    setConfirmModal({
      message: `End substitution for ${activeSub.substitute.user.name}? The class master will resume responsibility immediately.`,
      onConfirm: async () => {
        await fetch(`/api/substitutes/${activeSub.id}`, { method: "DELETE" })
        setActiveSub(null)
      },
    })
  }

  const stats = students.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1; return acc
  }, {} as Record<string, number>)

  // ── Responsibility banner ──────────────────────────────────────────────────
  function ResponsibilityBanner() {
    if (!selectedClassInfo) return null
    const classLabel = `${selectedClassInfo.name}${selectedClassInfo.section ? ` ${selectedClassInfo.section}` : ""}`

    if (loadingSub) return (
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking responsibility…
      </div>
    )

    if (activeSub) return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Substitute: <span className="font-bold">{activeSub.substitute.user.name}</span>
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Covering {classLabel} from {formatDate(activeSub.startDate)}
              {activeSub.endDate ? ` to ${formatDate(activeSub.endDate)}` : " · open-ended"}
              {activeSub.note && ` · "${activeSub.note}"`}
            </p>
          </div>
        </div>
        {canManageSub && (
          <button
            onClick={handleEndSub}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <CalendarX className="w-3.5 h-3.5" /> End Substitution
          </button>
        )}
      </div>
    )

    if (selectedClassInfo.classTeacher) return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Class Master: <span className="font-bold">{selectedClassInfo.classTeacher.user.name}</span>
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Responsible for attendance · {classLabel}
            </p>
          </div>
        </div>
        {canManageSub && (
          <button
            onClick={openSubModal}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <UserCog className="w-3.5 h-3.5" /> Assign Substitute
          </button>
        )}
      </div>
    )

    // No class master assigned
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">No class master assigned to {classLabel}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Go to Classes and assign a teacher as the class master.
            </p>
          </div>
        </div>
        {canManageSub && (
          <button
            onClick={openSubModal}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <UserCog className="w-3.5 h-3.5" /> Assign Someone
          </button>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Record and view daily student attendance" />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["mark", "history"] as const).map(t => (
          <button
            key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            {t === "mark" ? "Mark Attendance" : "View History"}
          </button>
        ))}
      </div>

      {/* ── Mark tab ─────────────────────────────────────────────────────────── */}
      {tab === "mark" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="label">Class *</label>
                <select
                  className="input w-52"
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                >
                  <option value="">— Select class —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.section ? ` ${c.section}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input type="date" className="input w-44" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              {students.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <span className="text-sm text-gray-500 self-center">Mark all:</span>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.value} onClick={() => markAll(s.value)}
                      className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg border", s.color)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Responsibility banner */}
            {selectedClass && <ResponsibilityBanner />}
          </div>

          {/* Stats */}
          {students.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATUS_OPTIONS.map(s => (
                <div key={s.value} className={cn("rounded-xl border p-4 text-center", s.color)}>
                  <p className="text-2xl font-bold">{stats[s.value] || 0}</p>
                  <p className="text-xs font-semibold mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Student list */}
          {loadingStudents ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 flex items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading students…
            </div>
          ) : !selectedClass ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
              <ClipboardCheck className="w-10 h-10 text-indigo-300 mb-3" />
              <p className="text-sm text-gray-500">Select a class to start marking attendance</p>
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
              No students in this class yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((s, i) => (
                      <tr key={s.studentId} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setStatus(s.studentId, opt.value)}
                                className={cn(
                                  "text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all",
                                  s.status === opt.value
                                    ? opt.color + " ring-2 ring-offset-1 ring-indigo-400"
                                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-400 w-36"
                            placeholder="Optional note…"
                            value={s.note}
                            onChange={e => setStudents(prev =>
                              prev.map(st => st.studentId === s.studentId ? { ...st, note: e.target.value } : st)
                            )}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">{students.length} students</p>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    "px-5 py-2 rounded-xl text-sm font-bold transition-colors",
                    saved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  )}
                >
                  {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Attendance"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── History tab ──────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Recent Attendance Records</h3>
          </div>
          {recentAttendance.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No attendance records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentAttendance.slice(0, 50).map(r => {
                    const opt = STATUS_OPTIONS.find(o => o.value === r.status)
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.student.user.name}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {r.class ? `${r.class.name}${r.class.section ? ` ${r.class.section}` : ""}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(r.date)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border",
                            opt?.color || "bg-gray-50 text-gray-600 border-gray-200")}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Assign Substitute Modal ───────────────────────────────────────────── */}
      {subOpen && selectedClassInfo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Assign Substitute</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedClassInfo.name}{selectedClassInfo.section ? ` — ${selectedClassInfo.section}` : ""}
                  {selectedClassInfo.classTeacher && ` · Class Master: ${selectedClassInfo.classTeacher.user.name}`}
                </p>
              </div>
              <button onClick={() => setSubOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleAssignSub} className="p-5 space-y-4">
              {subError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{subError}</div>
              )}
              <div>
                <label className="label">Substitute Teacher *</label>
                <select
                  required
                  className="input"
                  value={subForm.substituteId}
                  onChange={e => setSubForm(f => ({ ...f, substituteId: e.target.value }))}
                >
                  <option value="">— Select teacher —</option>
                  {teachers
                    .filter(t => t.id !== selectedClassInfo.classTeacher?.id)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.user.name}</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From *</label>
                  <input
                    required type="date" className="input"
                    value={subForm.startDate}
                    onChange={e => setSubForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Until <span className="text-gray-400 font-normal">(leave blank = open-ended)</span></label>
                  <input
                    type="date" className="input"
                    value={subForm.endDate}
                    min={subForm.startDate}
                    onChange={e => setSubForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Reason / Note <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  className="input"
                  placeholder="e.g. Class master on sick leave"
                  value={subForm.note}
                  onChange={e => setSubForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <strong>Note:</strong> The substitute will be responsible for marking attendance for this class during the assigned period. Any previous open-ended substitution will be ended automatically.
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => setSubOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={subSaving}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {subSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</>
                    : <><UserCheck className="w-4 h-4" /> Assign Substitute</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; width: 100%; background: white; }
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
