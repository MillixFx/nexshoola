"use client"

import { useState, useEffect } from "react"
import { ClipboardCheck, Check, X, Clock, Minus } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { cn, formatDate } from "@/lib/utils"

type ClassInfo = { id: string; name: string; section: string | null }
type AttRecord = {
  id: string; status: string; date: string | Date; note: string | null
  student: { id: string; user: { name: string } }
  class: { name: string; section: string | null } | null
}
type StudentRow = { studentId: string; name: string; status: string; note: string }

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present", icon: Check, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "ABSENT", label: "Absent", icon: X, color: "bg-red-100 text-red-700 border-red-200" },
  { value: "LATE", label: "Late", icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "EXCUSED", label: "Excused", icon: Minus, color: "bg-gray-100 text-gray-600 border-gray-200" },
]

export default function AttendanceClient({ classes, recentAttendance, schoolId }: { classes: ClassInfo[]; recentAttendance: AttRecord[]; schoolId: string }) {
  const [selectedClass, setSelectedClass] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<"mark" | "history">("mark")

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return }
    setLoadingStudents(true)
    fetch(`/api/students?schoolId=${schoolId}`)
      .then(r => r.json())
      .then((data: any[]) => {
        const classStudents = data.filter((s: any) => {
          const cls = classes.find(c => c.id === selectedClass)
          return s.class?.name === cls?.name && s.class?.section === cls?.section
        })
        setStudents(classStudents.map((s: any) => ({ studentId: s.id, name: s.user.name, status: "PRESENT", note: "" })))
      })
      .finally(() => setLoadingStudents(false))
  }, [selectedClass])

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
        body: JSON.stringify({ schoolId, classId: selectedClass, date, records: students.map(s => ({ studentId: s.studentId, status: s.status, note: s.note })) }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } finally { setSaving(false) }
  }

  const stats = students.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Record and view daily student attendance" />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["mark", "history"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors", tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t === "mark" ? "Mark Attendance" : "View History"}
          </button>
        ))}
      </div>

      {tab === "mark" && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="label">Class *</label>
                <select className="input w-52" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  <option value="">— Select class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>)}
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
                    <button key={s.value} onClick={() => markAll(s.value)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-lg border", s.color)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          {students.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
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
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">Loading students…</div>
          ) : !selectedClass ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
              <ClipboardCheck className="w-10 h-10 text-indigo-300 mb-3" />
              <p className="text-sm text-gray-500">Select a class to start marking attendance</p>
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">No students in this class yet.</div>
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
                                className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all", s.status === opt.value ? opt.color + " ring-2 ring-offset-1 ring-indigo-400" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100")}
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
                            onChange={e => setStudents(prev => prev.map(st => st.studentId === s.studentId ? { ...st, note: e.target.value } : st))}
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
                  className={cn("px-5 py-2 rounded-xl text-sm font-bold transition-colors", saved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60")}
                >
                  {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Attendance"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                        <td className="px-4 py-3 text-gray-500">{r.class ? `${r.class.name}${r.class.section ? ` ${r.class.section}` : ""}` : "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(r.date)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", opt?.color || "bg-gray-50 text-gray-600 border-gray-200")}>{r.status}</span>
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

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>
    </div>
  )
}
