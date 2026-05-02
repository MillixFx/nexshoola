"use client"

import { useState, useCallback } from "react"
import {
  FileText, Plus, Calendar, ClipboardList, Loader2, Pencil, Trash2, X,
  ChevronDown, Lightbulb, CalendarDays, Printer, Clock, MapPin,
} from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatDate, cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"
import { ghanaGrade, ghanaGradeColor } from "@/lib/grading"

type Exam = {
  id: string; title: string; term: string | null; academicYear: string | null
  startDate: string | Date | null; endDate: string | Date | null
  _count: { routines: number }
  routines: { subject: { title: string }; class: { name: string; section: string | null } }[]
}
type Class   = { id: string; name: string; section: string | null }
type Subject = { id: string; title: string }
type Student = { id: string; user: { name: string } }
type SubjectMark = { studentId: string; subjectId: string; marks: number; grade: string | null }

type ExamRoutine = {
  id: string; date: string; startTime: string; endTime: string; room: string | null
  class:   { id: string; name: string; section: string | null }
  subject: { id: string; title: string }
}

const emptyForm = { title: "", term: "Term 1", academicYear: new Date().getFullYear().toString(), startDate: "", endDate: "" }
const emptyRoutineForm = { classId: "", subjectId: "", date: "", startTime: "08:00", endTime: "10:00", room: "" }

const TERM_BADGE: Record<string, string> = {
  "Term 1": "bg-blue-50 text-blue-700",
  "Term 2": "bg-emerald-50 text-emerald-700",
  "Term 3": "bg-purple-50 text-purple-700",
}

export default function ExamsClient({
  exams: initial, classes, subjects, schoolId, isAdmin,
}: {
  exams: Exam[]; classes: Class[]; subjects: Subject[]; schoolId: string; isAdmin?: boolean
}) {
  const [exams, setExams] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editExam, setEditExam] = useState<Exam | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Marks entry state
  const [marksExam, setMarksExam] = useState<Exam | null>(null)
  const [marksClassId, setMarksClassId] = useState("")
  const [markStudents, setMarkStudents] = useState<Student[]>([])
  const [markSubjects, setMarkSubjects] = useState<Subject[]>([])
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({}) // {studentId: {subjectId: marks}}
  const [loadingMarks, setLoadingMarks] = useState(false)
  const [savingMark, setSavingMark] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // ── Timetable state ─────────────────────────────────────────────────────────
  const [ttExam,      setTtExam]      = useState<Exam | null>(null)
  const [ttRoutines,  setTtRoutines]  = useState<ExamRoutine[]>([])
  const [ttLoading,   setTtLoading]   = useState(false)
  const [ttSaving,    setTtSaving]    = useState(false)
  const [ttError,     setTtError]     = useState("")
  const [ttForm,      setTtForm]      = useState(emptyRoutineForm)
  const [ttShowForm,  setTtShowForm]  = useState(false)

  const loadRoutines = useCallback(async (examId: string) => {
    setTtLoading(true)
    try {
      const res = await fetch(`/api/exam-routines?examId=${examId}`)
      if (res.ok) setTtRoutines(await res.json())
    } finally { setTtLoading(false) }
  }, [])

  function openTimetable(exam: Exam) {
    setTtExam(exam)
    setTtForm(emptyRoutineForm)
    setTtShowForm(false)
    setTtError("")
    loadRoutines(exam.id)
  }

  async function handleAddRoutine(e: React.FormEvent) {
    e.preventDefault()
    if (!ttExam) return
    setTtSaving(true); setTtError("")
    try {
      const res = await fetch("/api/exam-routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: ttExam.id, ...ttForm }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const created: ExamRoutine = await res.json()
      setTtRoutines(prev => [...prev, created].sort(
        (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
      ))
      setExams(prev => prev.map(ex => ex.id === ttExam.id
        ? { ...ex, _count: { ...ex._count, routines: ex._count.routines + 1 } }
        : ex
      ))
      setTtForm(emptyRoutineForm)
      setTtShowForm(false)
    } catch (err: any) { setTtError(err.message || "Failed to add session") }
    finally { setTtSaving(false) }
  }

  function deleteRoutine(id: string) {
    setConfirmModal({
      message: "Remove this exam session from the timetable?",
      onConfirm: async () => {
        await fetch(`/api/exam-routines/${id}`, { method: "DELETE" })
        setTtRoutines(prev => prev.filter(r => r.id !== id))
        if (ttExam) {
          setExams(prev => prev.map(ex => ex.id === ttExam.id
            ? { ...ex, _count: { ...ex._count, routines: Math.max(0, ex._count.routines - 1) } }
            : ex
          ))
        }
      },
    })
  }

  // Group routines by date for display
  function groupByDate(routines: ExamRoutine[]) {
    const map = new Map<string, ExamRoutine[]>()
    for (const r of routines) {
      const day = r.date.split("T")[0]
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(r)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const method = editExam ? "PUT" : "POST"
      const url = editExam ? `/api/exams/${editExam.id}` : "/api/exams"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      const exam = await res.json()
      if (editExam) {
        setExams(prev => prev.map(e => e.id === exam.id ? { ...e, ...exam } : e))
      } else {
        setExams(prev => [{ ...exam, _count: { routines: 0 }, routines: [] }, ...prev])
      }
      setOpen(false); setEditExam(null); setForm(emptyForm)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  function deleteExam(id: string) {
    setConfirmModal({
      message: "Delete this exam and all its data?",
      onConfirm: async () => {
        await fetch(`/api/exams/${id}`, { method: "DELETE" }).catch(() => {})
        setExams(prev => prev.filter(e => e.id !== id))
      }
    })
  }

  function openEdit(exam: Exam) {
    setEditExam(exam)
    setForm({
      title: exam.title,
      term: exam.term ?? "Term 1",
      academicYear: exam.academicYear ?? "",
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().split("T")[0] : "",
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().split("T")[0] : "",
    })
    setOpen(true)
    setError("")
  }

  async function loadMarks(examId: string, classId: string) {
    if (!classId) return
    setLoadingMarks(true)
    try {
      const res = await fetch(`/api/marks?examId=${examId}&classId=${classId}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setMarkStudents(data.students)
      setMarkSubjects(data.subjects)
      // Build marks map from existing data
      const map: Record<string, Record<string, string>> = {}
      for (const m of (data.marks as SubjectMark[])) {
        if (!map[m.studentId]) map[m.studentId] = {}
        map[m.studentId][m.subjectId] = String(m.marks)
      }
      setMarks(map)
    } catch { setError("Failed to load marks") } finally { setLoadingMarks(false) }
  }

  async function saveMark(studentId: string, subjectId: string, value: string) {
    const examId = marksExam?.id
    if (!examId) return
    const key = `${studentId}-${subjectId}`
    setSavingMark(key)
    try {
      const numVal = parseFloat(value)
      if (isNaN(numVal) || numVal < 0 || numVal > 100) return
      await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, subjectId, examId, marks: numVal }),
      })
    } catch { } finally { setSavingMark(null) }
  }

  function setMark(studentId: string, subjectId: string, value: string) {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectId]: value },
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examinations"
        description={`${exams.length} exam${exams.length !== 1 ? "s" : ""} scheduled`}
        action={isAdmin ? (
          <button
            onClick={() => { setOpen(true); setEditExam(null); setError(""); setForm(emptyForm) }}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Exam
          </button>
        ) : undefined}
      />

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <FileText className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No exams yet</h2>
          <p className="text-sm text-gray-400">Exams will appear here once created.</p>
          {isAdmin && (
            <button onClick={() => { setOpen(true); setError("") }} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Create Exam</button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{exam.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{exam.academicYear}</p>
                </div>
                {exam.term && (
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full ml-2 shrink-0", TERM_BADGE[exam.term] || "bg-gray-100 text-gray-600")}>{exam.term}</span>
                )}
              </div>
              {(exam.startDate || exam.endDate) && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  {exam.startDate && formatDate(exam.startDate)}
                  {exam.startDate && exam.endDate && " — "}
                  {exam.endDate && formatDate(exam.endDate)}
                </div>
              )}
              <div className="flex items-center justify-between text-xs mt-2 pt-3 border-t border-gray-100">
                <span className="text-gray-500">{exam._count.routines} session{exam._count.routines !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openTimetable(exam)}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold"
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Schedule
                  </button>
                  <button
                    onClick={() => { setMarksExam(exam); setMarksClassId(""); setMarkStudents([]); setMarkSubjects([]); setMarks({}) }}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> Results
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => openEdit(exam)} className="text-gray-400 hover:text-gray-700">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteExam(exam.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Exam Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editExam ? "Edit Exam" : "Create Exam"}</h2>
              <button onClick={() => { setOpen(false); setEditExam(null) }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div><label className="label">Exam Title *</label><input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="End of Term 1 Exams" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Term</label>
                  <select className="input" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}>
                    {["Term 1", "Term 2", "Term 3"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="label">Academic Year</label><input className="input" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2024" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Start Date</label><input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
                <div><label className="label">End Date</label><input type="date" className="input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setOpen(false); setEditExam(null) }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : editExam ? "Save Changes" : "Create Exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Marks Entry Modal */}
      {marksExam && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-5xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Results — {marksExam.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Enter marks out of 100 per student per subject</p>
              </div>
              <button onClick={() => setMarksExam(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Class selector */}
            <div className="px-5 py-4 border-b border-gray-100 shrink-0 flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 shrink-0">Select Class:</label>
              <div className="relative">
                <select
                  className="appearance-none border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-48"
                  value={marksClassId}
                  onChange={e => {
                    setMarksClassId(e.target.value)
                    if (e.target.value) loadMarks(marksExam.id, e.target.value)
                    else { setMarkStudents([]); setMarkSubjects([]) }
                  }}
                >
                  <option value="">— Choose a class —</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {loadingMarks && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
            </div>

            {/* Marks table */}
            <div className="flex-1 overflow-auto p-5">
              {!marksClassId ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <ClipboardList className="w-10 h-10 mb-3 text-gray-300" />
                  <p className="text-sm">Select a class to enter marks</p>
                </div>
              ) : loadingMarks ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : markStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <p className="text-sm">No students found in this class</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border border-gray-200 sticky left-0 bg-gray-50 min-w-44">
                          Student
                        </th>
                        {markSubjects.map(sub => (
                          <th key={sub.id} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border border-gray-200 min-w-28">
                            {sub.title}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border border-gray-200 min-w-20">Total</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase border border-gray-200 min-w-16">Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {markStudents.map(student => {
                        const studentMarks = marks[student.id] ?? {}
                        const markValues = markSubjects.map(s => parseFloat(studentMarks[s.id] ?? "")).filter(v => !isNaN(v))
                        const total = markValues.reduce((a, b) => a + b, 0)
                        const avg = markValues.length > 0 ? total / markValues.length : null

                        return (
                          <tr key={student.id} className="hover:bg-blue-50/30">
                            <td className="px-4 py-2 font-medium text-gray-900 border border-gray-200 sticky left-0 bg-white">
                              {student.user.name}
                            </td>
                            {markSubjects.map(sub => {
                              const key = `${student.id}-${sub.id}`
                              const val = studentMarks[sub.id] ?? ""
                              const numVal = parseFloat(val)
                              return (
                                <td key={sub.id} className="px-2 py-1 border border-gray-200 text-center">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      value={val}
                                      onChange={e => setMark(student.id, sub.id, e.target.value)}
                                      onBlur={e => saveMark(student.id, sub.id, e.target.value)}
                                      className={cn(
                                        "w-full text-center rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500",
                                        !isNaN(numVal) && numVal < 50 ? "border-red-300 bg-red-50" :
                                        !isNaN(numVal) && numVal >= 80 ? "border-emerald-300 bg-emerald-50" :
                                        "border-gray-200"
                                      )}
                                      placeholder="—"
                                    />
                                    {savingMark === key && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                                      </div>
                                    )}
                                  </div>
                                  {!isNaN(numVal) && val !== "" && (
                                    <p className={cn("text-[10px] font-bold mt-0.5", ghanaGradeColor(numVal))}>
                                      {ghanaGrade(numVal)}
                                    </p>
                                  )}
                                </td>
                              )
                            })}
                            <td className="px-3 py-2 border border-gray-200 text-center font-bold text-gray-700">
                              {markValues.length > 0 ? total.toFixed(1) : "—"}
                            </td>
                            <td className="px-3 py-2 border border-gray-200 text-center">
                              {avg !== null ? (
                                <span className={cn("font-bold text-xs", avg >= 50 ? "text-emerald-600" : "text-red-500")}>
                                  {avg.toFixed(1)}%
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-400 mt-3 flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>Marks are saved automatically when you click out of each cell. Red = below 50%, Green = 80%+.</span>
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex justify-end">
              <button onClick={() => setMarksExam(null)} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Timetable / Schedule Modal ──────────────────────────────────────── */}
      {ttExam && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0 print:hidden">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Exam Schedule — {ttExam.title}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {ttExam.term && `${ttExam.term} · `}{ttExam.academicYear}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} title="Print schedule"
                  className="p-2 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                  <Printer className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => { setTtShowForm(f => !f); setTtError("") }}
                    className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4" /> Add Session
                  </button>
                )}
                <button onClick={() => setTtExam(null)} className="text-gray-400 hover:text-gray-600 ml-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Add session form */}
            {ttShowForm && (
              <form onSubmit={handleAddRoutine} className="px-5 py-4 border-b border-indigo-100 bg-indigo-50/50 space-y-3 shrink-0">
                {ttError && <p className="text-sm text-red-600">{ttError}</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label">Class *</label>
                    <select required className="input" value={ttForm.classId}
                      onChange={e => setTtForm(f => ({ ...f, classId: e.target.value }))}>
                      <option value="">— Select —</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Subject *</label>
                    <select required className="input" value={ttForm.subjectId}
                      onChange={e => setTtForm(f => ({ ...f, subjectId: e.target.value }))}>
                      <option value="">— Select —</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Date *</label>
                    <input required type="date" className="input" value={ttForm.date}
                      onChange={e => setTtForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Start Time *</label>
                    <input required type="time" className="input" value={ttForm.startTime}
                      onChange={e => setTtForm(f => ({ ...f, startTime: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">End Time *</label>
                    <input required type="time" className="input" value={ttForm.endTime}
                      onChange={e => setTtForm(f => ({ ...f, endTime: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Room / Venue</label>
                    <input className="input" placeholder="e.g. Hall A" value={ttForm.room}
                      onChange={e => setTtForm(f => ({ ...f, room: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setTtShowForm(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={ttSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                    {ttSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {ttSaving ? "Adding…" : "Add Session"}
                  </button>
                </div>
              </form>
            )}

            {/* Schedule list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {ttLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading schedule…
                </div>
              ) : ttRoutines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarDays className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No sessions scheduled yet</p>
                  {isAdmin && (
                    <button onClick={() => setTtShowForm(true)}
                      className="mt-3 text-sm text-indigo-600 font-semibold hover:underline">
                      + Add your first session
                    </button>
                  )}
                </div>
              ) : (
                groupByDate(ttRoutines).map(([day, sessions]) => {
                  const dt = new Date(day + "T00:00:00")
                  const dayLabel = dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                  return (
                    <div key={day}>
                      {/* Date heading */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-indigo-600 text-white rounded-xl px-3 py-1.5 text-center min-w-[52px]">
                          <p className="text-xs font-bold uppercase leading-none">
                            {dt.toLocaleDateString("en-GB", { month: "short" })}
                          </p>
                          <p className="text-xl font-extrabold leading-tight">{dt.getDate()}</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{dayLabel.split(",")[0]}</p>
                          <p className="text-xs text-gray-400">{dt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                        </div>
                        <div className="flex-1 h-px bg-gray-100 ml-2" />
                      </div>

                      {/* Sessions for this day */}
                      <div className="space-y-2 ml-16">
                        {sessions.map(s => (
                          <div key={s.id}
                            className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 hover:bg-indigo-50/40 group transition-colors">
                            {/* Time */}
                            <div className="flex items-center gap-1 text-xs text-gray-500 min-w-[100px] shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              {s.startTime} – {s.endTime}
                            </div>

                            {/* Subject */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">{s.subject.title}</p>
                              <p className="text-xs text-gray-400">
                                {s.class.name}{s.class.section ? ` ${s.class.section}` : ""}
                              </p>
                            </div>

                            {/* Room */}
                            {s.room && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                                <MapPin className="w-3 h-3" />
                                {s.room}
                              </div>
                            )}

                            {/* Delete */}
                            {isAdmin && (
                              <button
                                onClick={() => deleteRoutine(s.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex justify-between items-center print:hidden">
              <p className="text-xs text-gray-400">{ttRoutines.length} session{ttRoutines.length !== 1 ? "s" : ""} scheduled</p>
              <button onClick={() => setTtExam(null)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">
                Close
              </button>
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
