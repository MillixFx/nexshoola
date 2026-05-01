"use client"

import { useRouter } from "next/navigation"
import { Printer, ArrowLeft, GraduationCap } from "lucide-react"
import { formatDate, cn } from "@/lib/utils"

type Mark = { subject: string; code: string | null; marks: number; grade: string | null }
type Exam = { id: string; title: string; term: string | null; academicYear: string | null }

function gradeColor(m: number) {
  if (m >= 80) return "text-emerald-700"
  if (m >= 60) return "text-blue-700"
  if (m >= 50) return "text-amber-700"
  return "text-red-600"
}

function gradeRemark(m: number) {
  if (m >= 80) return "Excellent"
  if (m >= 75) return "Very Good"
  if (m >= 65) return "Good"
  if (m >= 55) return "Average"
  if (m >= 50) return "Pass"
  return "Fail"
}

export default function ReportCardClient({
  student, exam, exams, marks, stats, school,
}: {
  student: {
    id: string; name: string; studentId: string | null; rollNumber: string | null
    class: { name: string; section: string | null } | null; parentName: string | null; admissionDate: string
  }
  exam: Exam | null; exams: Exam[]
  marks: Mark[]
  stats: { total: number; average: number; rank: number | null; classSize: number | null }
  school: { name: string; address: string | null; phone: string | null; email: string | null; logo: string | null }
}) {
  const router = useRouter()

  function changeExam(examId: string) {
    router.push(`/dashboard/students/${student.id}/report-card?examId=${examId}`)
  }

  const overallGrade = stats.average >= 80 ? "A+"
    : stats.average >= 75 ? "A"
    : stats.average >= 70 ? "B+"
    : stats.average >= 65 ? "B"
    : stats.average >= 60 ? "C+"
    : stats.average >= 55 ? "C"
    : stats.average >= 50 ? "D"
    : "F"

  return (
    <div>
      {/* Controls — hidden on print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          {exams.length > 1 && (
            <select
              value={exam?.id ?? ""}
              onChange={e => changeExam(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.title}{e.term ? ` — ${e.term}` : ""}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700"
          >
            <Printer className="w-4 h-4" /> Print Report Card
          </button>
        </div>
      </div>

      {/* ══ REPORT CARD ═══════════════════════════════════════ */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl max-w-2xl mx-auto print:border-0 print:shadow-none print:rounded-none print:max-w-none">
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
              ["Student Name", student.name],
              ["Student ID", student.studentId ?? "—"],
              ["Class", student.class ? `${student.class.name}${student.class.section ? ` ${student.class.section}` : ""}` : "—"],
              ["Roll Number", student.rollNumber ?? "—"],
              ["Parent / Guardian", student.parentName ?? "—"],
              ["Date Issued", new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="text-gray-400 w-32 shrink-0 text-xs">{label}:</span>
                <span className="font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Marks table */}
        <div className="p-6">
          {marks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No marks recorded for this exam.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide rounded-tl-lg">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide">Subject</th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wide">Score</th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wide">Grade</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide rounded-tr-lg">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.map((m, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {m.subject}
                        {m.code && <span className="ml-1.5 text-xs text-gray-400 font-mono">{m.code}</span>}
                      </td>
                      <td className={cn("px-4 py-2.5 text-center font-extrabold text-lg", gradeColor(m.marks))}>
                        {m.marks}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn("text-sm font-extrabold", gradeColor(m.marks))}>
                          {m.grade ?? (m.marks >= 80 ? "A+" : m.marks >= 75 ? "A" : m.marks >= 70 ? "B+" : m.marks >= 65 ? "B" : m.marks >= 60 ? "C+" : m.marks >= 55 ? "C" : m.marks >= 50 ? "D" : "F")}
                        </span>
                      </td>
                      <td className={cn("px-4 py-2.5 text-xs font-medium", gradeColor(m.marks))}>
                        {gradeRemark(m.marks)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                    <td colSpan={2} className="px-4 py-3 font-bold text-gray-900 uppercase text-xs tracking-wide">
                      Total / Average
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-lg font-extrabold text-indigo-700">{stats.average.toFixed(1)}</span>
                      <span className="text-xs text-gray-400 block">/ 100</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("text-xl font-extrabold", gradeColor(stats.average))}>{overallGrade}</span>
                    </td>
                    <td className={cn("px-4 py-3 text-xs font-bold", gradeColor(stats.average))}>
                      {gradeRemark(stats.average)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Summary row */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Total Score", value: `${stats.total.toFixed(0)} / ${marks.length * 100}` },
                  { label: "Average", value: `${stats.average.toFixed(1)}%` },
                  { label: "Class Position", value: stats.rank && stats.classSize ? `${stats.rank} of ${stats.classSize}` : "N/A" },
                ].map(s => (
                  <div key={s.label} className="border border-gray-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                    <p className="text-lg font-extrabold text-gray-900 mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Grade key */}
              <div className="mt-5 border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Grade Key</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { range: "80–100", grade: "A+", label: "Excellent" },
                    { range: "75–79", grade: "A", label: "Very Good" },
                    { range: "70–74", grade: "B+", label: "Good" },
                    { range: "65–69", grade: "B", label: "Good" },
                    { range: "60–64", grade: "C+", label: "Average" },
                    { range: "55–59", grade: "C", label: "Average" },
                    { range: "50–54", grade: "D", label: "Pass" },
                    { range: "0–49", grade: "F", label: "Fail" },
                  ].map(g => (
                    <div key={g.grade} className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                      <span className="font-bold text-gray-700">{g.grade}</span>
                      <span className="text-gray-400">=</span>
                      <span className="text-gray-500">{g.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Signatures */}
        <div className="px-6 pb-6 grid grid-cols-3 gap-6 text-center text-xs text-gray-400">
          {["Class Teacher", "Headmaster / Principal", "Parent / Guardian"].map(sig => (
            <div key={sig}>
              <div className="border-b border-gray-300 mb-1.5 h-8" />
              <p className="font-medium text-gray-500">{sig}</p>
              <p className="text-gray-300">Signature & Date</p>
            </div>
          ))}
        </div>

        {/* School stamp area */}
        <div className="flex justify-end px-6 pb-6 print:block">
          <div className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center">
            <p className="text-xs text-gray-300 text-center leading-tight">School<br/>Stamp</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          header, nav, aside, .print\\:hidden { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
