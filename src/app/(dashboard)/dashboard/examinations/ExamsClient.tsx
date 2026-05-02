"use client"

import { useState } from "react"
import { FileText, Plus, Calendar, ClipboardList, Loader2, Pencil, Trash2, X, ChevronDown, Lightbulb } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatDate, cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type Exam = {
  id: string; title: string; term: string | null; academicYear: string | null
  startDate: string | Date | null; endDate: string | Date | null
  _count: { routines: number }
  routines: { subject: { title: string }; class: { name: string; section: string | null } }[]
}
type Class = { id: string; name: string; section: string | null }
type Subject = { id: string; title: string }
type Student = { id: string; user: { name: string } }
type SubjectMark = { studentId: string; subjectId: string; marks: number; grade: string | null }

const emptyForm = { title: "", term: "Term 1", academicYear: new Date().getFullYear().toString(), startDate: "", endDate: "" }

const TERM_BADGE: Record<string, string> = {
  "Term 1": "bg-blue-50 text-blue-700",
  "Term 2": "bg-emerald-50 text-emerald-700",
  "Term 3": "bg-purple-50 text-purple-700",
}

// Grade helper
function calcGrade(mark: number): string {
  if (mark >= 80) return "A+"
  if (mark >= 75) return "A"
  if (mark >= 70) return "B+"
  if (mark >= 65) return "B"
  if (mark >= 60) return "C+"
  if (mark >= 55) return "C"
  if (mark >= 50) return "D"
  return "F"
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
        body: JSON.stringify({ studentId, subjectId, examId, marks: numVal, grade: calcGrade(numVal) }),
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
                <span className="text-gray-500">{exam._count.routines} subject{exam._count.routines !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-2">
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
                                    <p className={cn("text-[10px] font-bold mt-0.5", numVal >= 50 ? "text-emerald-600" : "text-red-500")}>
                                      {calcGrade(numVal)}
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
