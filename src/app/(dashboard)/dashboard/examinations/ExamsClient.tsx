"use client"

import { useState } from "react"
import { FileText, Plus, Calendar } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatDate, cn } from "@/lib/utils"

type Exam = {
  id: string; title: string; term: string | null; academicYear: string | null
  startDate: string | Date | null; endDate: string | Date | null
  _count: { examRoutines: number }
  examRoutines: { subject: { title: string }; class: { name: string; section: string | null } }[]
}
type Class = { id: string; name: string; section: string | null }
type Subject = { id: string; title: string }

const emptyForm = { title: "", term: "Term 1", academicYear: new Date().getFullYear().toString(), startDate: "", endDate: "" }

export default function ExamsClient({ exams: initial, classes, subjects, schoolId }: { exams: Exam[]; classes: Class[]; subjects: Subject[]; schoolId: string }) {
  const [exams, setExams] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      const exam = await res.json()
      setExams(prev => [{ ...exam, _count: { examRoutines: 0 }, examRoutines: [] }, ...prev])
      setOpen(false)
      setForm(emptyForm)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function deleteExam(id: string) {
    if (!confirm("Delete this exam?")) return
    await fetch(`/api/exams/${id}`, { method: "DELETE" }).catch(() => {})
    setExams(prev => prev.filter(e => e.id !== id))
  }

  const TERM_BADGE: Record<string, string> = {
    "Term 1": "bg-blue-50 text-blue-700",
    "Term 2": "bg-emerald-50 text-emerald-700",
    "Term 3": "bg-purple-50 text-purple-700",
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Examinations" description={`${exams.length} exam${exams.length !== 1 ? "s" : ""} scheduled`} action={
        <button onClick={() => { setOpen(true); setError(""); setForm(emptyForm) }} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" /> New Exam
        </button>
      } />

      {exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <FileText className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No exams yet</h2>
          <button onClick={() => { setOpen(true); setError("") }} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Create Exam</button>
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
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-3 border-t border-gray-100">
                <span>{exam._count.examRoutines} subject{exam._count.examRoutines !== 1 ? "s" : ""}</span>
                <button onClick={() => deleteExam(exam.id)} className="text-red-400 hover:text-red-600 font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Create Exam</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
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
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Creating…" : "Create Exam"}</button>
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
