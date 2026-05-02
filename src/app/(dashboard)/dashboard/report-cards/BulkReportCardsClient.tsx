"use client"

import { useState } from "react"
import { Printer, FileText, Loader2, GraduationCap } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { cn } from "@/lib/utils"
import { ghanaGrade, ghanaGradeColor, ghanaRemark, GHANA_GRADE_KEY } from "@/lib/grading"

type Class = { id: string; name: string; section: string | null }
type Exam = { id: string; title: string; term: string | null; academicYear: string | null }
type School = { name: string; address: string | null; phone: string | null; email: string | null; logo: string | null }

type Mark = { subject: string; code: string | null; marks: number; grade: string | null }
type Report = {
  student: {
    id: string; name: string; studentId: string | null; rollNumber: string | null
    class: { name: string; section: string | null } | null; parentName: string | null
  }
  marks: Mark[]
  stats: { total: number; average: number; rank: number | null; classSize: number | null }
}

export default function BulkReportCardsClient({
  classes, exams, school,
}: { classes: Class[]; exams: Exam[]; school: School }) {
  const [classId, setClassId] = useState("")
  const [examId, setExamId] = useState("")
  const [reports, setReports] = useState<Report[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleGenerate() {
    if (!classId || !examId) {
      setError("Select a class and an exam")
      return
    }
    setError(""); setLoading(true); setReports(null)
    try {
      const res = await fetch(`/api/report-cards/bulk?classId=${classId}&examId=${examId}`)
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setReports(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const exam = exams.find(e => e.id === examId) ?? null

  return (
    <div className="space-y-6">
      {/* Controls — hidden on print */}
      <div className="print:hidden space-y-6">
        <PageHeader
          title="Bulk Report Cards"
          description="Generate report cards for an entire class in one click"
        />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Class *</label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select class —</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Examination *</label>
              <select
                value={examId}
                onChange={e => setExamId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select exam —</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.title}{e.term ? ` — ${e.term}` : ""}{e.academicYear ? ` (${e.academicYear})` : ""}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading || !classId || !examId}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {loading ? "Generating…" : "Generate Report Cards"}
            </button>

            {reports && reports.length > 0 && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700"
              >
                <Printer className="w-4 h-4" /> Print All / Save PDF
              </button>
            )}
          </div>

          {reports && (
            <p className="text-sm text-gray-500">
              {reports.length === 0
                ? "No students found in this class."
                : `${reports.length} report card${reports.length !== 1 ? "s" : ""} ready. Use Print to save as PDF (one card per page).`}
            </p>
          )}
        </div>
      </div>

      {/* ── Printable cards (hidden until generated) ── */}
      {reports && reports.length > 0 && (
        <div className="space-y-6 print:space-y-0">
          {reports.map((r, idx) => (
            <div
              key={r.student.id}
              className={cn(
                "bg-white border-2 border-gray-200 rounded-2xl max-w-2xl mx-auto",
                "print:border-0 print:shadow-none print:rounded-none print:max-w-none",
                idx > 0 && "print:break-before-page"
              )}
            >
              {/* School header */}
              <div className="border-b-2 border-indigo-600 p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h1 className="text-xl font-extrabold text-gray-900">{school.name}</h1>
                    {school.address && <p className="text-xs text-gray-500">{school.address}</p>}
                  </div>
                </div>
                <div className="mt-3 inline-block bg-indigo-600 text-white text-sm font-bold px-6 py-1.5 rounded-full tracking-wide">
                  STUDENT REPORT CARD
                </div>
                {exam && (
                  <p className="text-xs text-gray-500 mt-2">
                    {exam.title}{exam.term ? ` · ${exam.term}` : ""}{exam.academicYear ? ` · Academic Year ${exam.academicYear}` : ""}
                  </p>
                )}
              </div>

              {/* Student info */}
              <div className="p-6 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {[
                    ["Student Name", r.student.name],
                    ["Student ID", r.student.studentId ?? "—"],
                    ["Class", r.student.class ? `${r.student.class.name}${r.student.class.section ? ` ${r.student.class.section}` : ""}` : "—"],
                    ["Roll Number", r.student.rollNumber ?? "—"],
                    ["Parent / Guardian", r.student.parentName ?? "—"],
                    ["Date Issued", new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline gap-2">
                      <span className="text-gray-400 w-32 shrink-0 text-xs">{label}:</span>
                      <span className="font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marks */}
              <div className="p-6">
                {r.marks.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">No marks recorded for this exam.</p>
                ) : (
                  <>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-indigo-600 text-white">
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase rounded-tl-lg">#</th>
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase">Subject</th>
                          <th className="px-3 py-2 text-center text-xs font-bold uppercase">Score</th>
                          <th className="px-3 py-2 text-center text-xs font-bold uppercase">Grade</th>
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase rounded-tr-lg">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.marks.map((m, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-900">{m.subject}</td>
                            <td className={cn("px-3 py-2 text-center font-extrabold text-base", ghanaGradeColor(m.marks))}>{m.marks}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={cn("text-sm font-extrabold", ghanaGradeColor(m.marks))}>
                                {m.grade ?? ghanaGrade(m.marks)}
                              </span>
                            </td>
                            <td className={cn("px-3 py-2 text-xs font-medium", ghanaGradeColor(m.marks))}>{ghanaRemark(m.marks)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                          <td colSpan={2} className="px-3 py-2.5 font-bold text-gray-900 uppercase text-xs">Total / Average</td>
                          <td className="px-3 py-2.5 text-center"><span className="text-base font-extrabold text-indigo-700">{r.stats.average.toFixed(1)}</span></td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={cn("text-lg font-extrabold", ghanaGradeColor(r.stats.average))}>
                              {ghanaGrade(r.stats.average)}
                            </span>
                          </td>
                          <td className={cn("px-3 py-2.5 text-xs font-bold", ghanaGradeColor(r.stats.average))}>{ghanaRemark(r.stats.average)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { label: "Total", value: `${r.stats.total.toFixed(0)}/${r.marks.length * 100}` },
                        { label: "Average", value: `${r.stats.average.toFixed(1)}%` },
                        { label: "Position", value: r.stats.rank && r.stats.classSize ? `${r.stats.rank} of ${r.stats.classSize}` : "N/A" },
                      ].map(s => (
                        <div key={s.label} className="border border-gray-200 rounded-xl p-2 text-center">
                          <p className="text-[10px] text-gray-400 font-medium uppercase">{s.label}</p>
                          <p className="text-base font-extrabold text-gray-900">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Signatures */}
              <div className="px-6 pb-6 grid grid-cols-3 gap-6 text-center text-xs text-gray-400">
                {["Class Teacher", "Headmaster", "Parent / Guardian"].map(sig => (
                  <div key={sig}>
                    <div className="border-b border-gray-300 mb-1.5 h-7" />
                    <p className="font-medium text-gray-500">{sig}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @media print {
          header, nav, aside, .print\\:hidden { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </div>
  )
}
