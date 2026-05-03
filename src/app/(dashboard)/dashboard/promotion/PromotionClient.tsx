"use client"

import { useState, useMemo } from "react"
import { ArrowRight, CheckSquare, Square, ArrowUpCircle, Users, History, ChevronDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { cn } from "@/lib/utils"

type ClassRow = { id: string; name: string; section: string | null; _count: { students: number } }
type StudentRow = { id: string; classId: string | null; rollNumber: string | null; studentId: string | null; user: { name: string } }
type HistoryRow = { id: string; promotedAt: string; note: string | null; student: { name: string; rollNumber: string | null }; fromClass: { name: string; section: string | null }; toClass: { name: string; section: string | null } }

function className(c: { name: string; section: string | null }) {
  return c.section ? `${c.name} ${c.section}` : c.name
}
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function PromotionClient({ classes, students }: { classes: ClassRow[]; students: StudentRow[] }) {
  const [tab, setTab] = useState<"promote" | "history">("promote")
  const [fromClassId, setFromClassId] = useState("")
  const [toClassId, setToClassId] = useState("")
  const [note, setNote] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [promoting, setPromoting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fromClass = classes.find(c => c.id === fromClassId)
  const toClass   = classes.find(c => c.id === toClassId)

  const studentsInFromClass = useMemo(() =>
    students.filter(s => s.classId === fromClassId),
    [students, fromClassId]
  )

  function handleFromClass(id: string) {
    setFromClassId(id)
    setSelected(new Set(students.filter(s => s.classId === id).map(s => s.id)))
    setError(""); setSuccess("")
  }

  function toggleAll() {
    if (selected.size === studentsInFromClass.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(studentsInFromClass.map(s => s.id)))
    }
  }

  function toggleStudent(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  async function handlePromote() {
    if (!fromClassId || !toClassId) { setError("Choose both From and To classes."); return }
    if (fromClassId === toClassId) { setError("From and To class cannot be the same."); return }
    if (selected.size === 0) { setError("Select at least one student."); return }
    setPromoting(true); setError(""); setSuccess("")
    try {
      const res = await fetch("/api/promotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotions: [...selected].map(studentId => ({ studentId, fromClassId, toClassId })),
          note: note.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(`✓ ${data.promoted} student${data.promoted !== 1 ? "s" : ""} promoted from ${className(fromClass!)} to ${className(toClass!)}`)
      setSelected(new Set())
      setFromClassId(""); setToClassId(""); setNote("")
    } catch (e: any) {
      setError(e.message || "Promotion failed.")
    } finally { setPromoting(false) }
  }

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/promotion")
      if (res.ok) setHistory(await res.json())
    } finally { setHistoryLoading(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Promotion"
        description="Move students to their next class at the end of term or year"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: "promote" as const, label: "Promote Students", icon: ArrowUpCircle },
          { key: "history" as const, label: "History",          icon: History },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === "history") loadHistory() }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === t.key ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === "promote" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: config */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Configure Promotion</h3>

              {/* From class */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">From Class</label>
                <div className="relative">
                  <select
                    value={fromClassId}
                    onChange={e => handleFromClass(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white pr-8"
                  >
                    <option value="">— Select class —</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{className(c)} ({c._count.students})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-indigo-500" />
                </div>
              </div>

              {/* To class */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">To Class</label>
                <div className="relative">
                  <select
                    value={toClassId}
                    onChange={e => { setToClassId(e.target.value); setError(""); setSuccess("") }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white pr-8"
                  >
                    <option value="">— Select class —</option>
                    {classes.filter(c => c.id !== fromClassId).map(c => (
                      <option key={c.id} value={c.id}>{className(c)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Note <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="End of Year 2024/25…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Summary */}
              {fromClassId && toClassId && selected.size > 0 && (
                <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-800">
                  <p className="font-semibold">Ready to promote</p>
                  <p className="text-xs mt-0.5 text-indigo-600">
                    {selected.size} student{selected.size !== 1 ? "s" : ""} · {fromClass && className(fromClass)} → {toClass && className(toClass)}
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
                </div>
              )}

              <button
                onClick={handlePromote}
                disabled={promoting || !fromClassId || !toClassId || selected.size === 0}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                {promoting ? "Promoting…" : `Promote ${selected.size > 0 ? selected.size : ""} Student${selected.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          {/* Right: student list */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <h3 className="font-bold text-gray-900 text-sm">
                  {fromClassId
                    ? `${fromClass && className(fromClass)} — ${studentsInFromClass.length} students`
                    : "Select a class to see students"}
                </h3>
              </div>
              {studentsInFromClass.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {selected.size === studentsInFromClass.length ? (
                    <><CheckSquare className="w-4 h-4" /> Deselect All</>
                  ) : (
                    <><Square className="w-4 h-4" /> Select All</>
                  )}
                </button>
              )}
            </div>

            {!fromClassId ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ArrowUpCircle className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm">Choose a "From Class" on the left to see students</p>
              </div>
            ) : studentsInFromClass.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm">No active students in this class</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {studentsInFromClass.map(s => {
                  const checked = selected.has(s.id)
                  return (
                    <li
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors",
                        checked ? "bg-indigo-50" : "hover:bg-gray-50"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        checked ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                      )}>
                        {checked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                        {initials(s.user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{s.user.name}</p>
                        <p className="text-xs text-gray-400">
                          {s.rollNumber ? `Roll: ${s.rollNumber}` : s.studentId ? `ID: ${s.studentId}` : "No ID"}
                        </p>
                      </div>
                      {checked && toClassId && (
                        <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium shrink-0">
                          <ArrowRight className="w-3 h-3" />
                          {toClass && className(toClass)}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Promotion History</h3>
            <p className="text-xs text-gray-500 mt-0.5">All student class promotions</p>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <History className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm">No promotions recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Student</th>
                    <th className="px-5 py-3 text-left">From</th>
                    <th className="px-3 py-3"></th>
                    <th className="px-5 py-3 text-left">To</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials(h.student.name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{h.student.name}</p>
                            {h.student.rollNumber && <p className="text-xs text-gray-400">Roll: {h.student.rollNumber}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{className(h.fromClass)}</td>
                      <td className="px-3 py-3 text-gray-300"><ArrowRight className="w-4 h-4" /></td>
                      <td className="px-5 py-3 text-indigo-700 font-semibold">{className(h.toClass)}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(h.promotedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{h.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
