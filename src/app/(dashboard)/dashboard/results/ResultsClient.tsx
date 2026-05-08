"use client"

import { useState, useCallback } from "react"
import {
  BarChart3, Trophy, TrendingUp, Users, BookOpen,
  Loader2, ChevronDown, Download, Medal,
} from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Exam  = { id: string; title: string; term: string | null; academicYear: string | null }
type Class = { id: string; name: string; section: string | null }

type SubjectAvg = {
  id: string; title: string; avg: number; min: number; max: number; count: number; passRate: number
}
type GradeBucket = { grade: number; label: string; count: number; pct: number }
type TopStudent  = {
  rank: number; id: string; name: string; photo: string | null; studentId: string | null
  avg: number; total: number; subjects: number; grade: number; remark: string
}
type Summary = {
  classAvg: number; passRate: number; highest: number; lowest: number
  totalStudents: number; markedStudents: number; subjectCount: number
}
type ResultsData = {
  summary: Summary
  subjectAverages: SubjectAvg[]
  gradeDistribution: GradeBucket[]
  topStudents: TopStudent[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeColor(g: number): string {
  if (g <= 1) return "bg-emerald-500"
  if (g <= 2) return "bg-green-500"
  if (g <= 3) return "bg-blue-500"
  if (g <= 5) return "bg-indigo-500"
  if (g <= 8) return "bg-amber-400"
  return "bg-red-500"
}

function gradePill(g: number): string {
  if (g <= 1) return "bg-emerald-100 text-emerald-800"
  if (g <= 2) return "bg-green-100 text-green-800"
  if (g <= 3) return "bg-blue-100 text-blue-800"
  if (g <= 5) return "bg-indigo-100 text-indigo-800"
  if (g <= 8) return "bg-amber-100 text-amber-800"
  return "bg-red-100 text-red-800"
}

function scoreColor(avg: number): string {
  if (avg >= 80) return "text-emerald-700"
  if (avg >= 70) return "text-green-600"
  if (avg >= 60) return "text-blue-700"
  if (avg >= 50) return "text-indigo-600"
  if (avg >= 40) return "text-amber-600"
  return "text-red-600"
}

function Avatar({ photo, name, size = 8 }: { photo: string | null; name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  if (photo) {
    return <img src={photo} alt={name} className={`w-${size} h-${size} rounded-full object-cover border border-gray-200 shrink-0`} />
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  )
}

function exportCSV(data: ResultsData, examTitle: string, className: string) {
  const rows: string[] = [
    `Results – ${examTitle} – ${className}`,
    "",
    "SUMMARY",
    `Class Average,${data.summary.classAvg}`,
    `Pass Rate,${data.summary.passRate}%`,
    `Highest Score,${data.summary.highest}`,
    `Lowest Score,${data.summary.lowest}`,
    `Students Marked,${data.summary.markedStudents} / ${data.summary.totalStudents}`,
    "",
    "SUBJECT AVERAGES",
    "Subject,Average,Min,Max,Pass Rate,Students",
    ...data.subjectAverages.map(s =>
      `"${s.title}",${s.avg},${s.min},${s.max},${s.passRate}%,${s.count}`
    ),
    "",
    "TOP STUDENTS",
    "Rank,Name,Student ID,Average,Grade,Remark",
    ...data.topStudents.map(s =>
      `${s.rank},"${s.name}",${s.studentId ?? ""},${s.avg},${s.grade},"${s.remark}"`
    ),
  ]
  const blob = new Blob([rows.join("\n")], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `results-${examTitle.replace(/\s+/g, "-")}-${className.replace(/\s+/g, "-")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResultsClient({ exams, classes }: { exams: Exam[]; classes: Class[] }) {
  const [examId,  setExamId]  = useState("")
  const [classId, setClassId] = useState("")
  const [loading, setLoading] = useState(false)
  const [data,    setData]    = useState<ResultsData | null>(null)
  const [error,   setError]   = useState("")

  const fetch_ = useCallback(async (eId: string, cId: string) => {
    if (!eId || !cId) { setData(null); return }
    setLoading(true); setError(""); setData(null)
    try {
      const res  = await fetch(`/api/results?examId=${eId}&classId=${cId}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Failed to load results"); return }
      setData(json)
    } catch { setError("Failed to load results") }
    finally { setLoading(false) }
  }, [])

  function onExamChange(id: string)  { setExamId(id);  fetch_(id, classId) }
  function onClassChange(id: string) { setClassId(id); fetch_(examId, id)  }

  const selectedExam  = exams.find(e => e.id === examId)
  const selectedClass = classes.find(c => c.id === classId)
  const className     = selectedClass
    ? `${selectedClass.name}${selectedClass.section ? ` ${selectedClass.section}` : ""}`
    : ""

  const maxSubjectAvg = data ? Math.max(...data.subjectAverages.map(s => s.avg), 1) : 1
  const maxGradeBucket = data ? Math.max(...data.gradeDistribution.map(g => g.count), 1) : 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results Overview"
        description="Analyse class performance by exam and subject"
        action={
          data && data.summary.markedStudents > 0
            ? (
              <button
                onClick={() => exportCSV(data, selectedExam?.title ?? "exam", className)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )
            : undefined
        }
      />

      {/* ── Selectors ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Exam */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Examination</label>
            <div className="relative">
              <select
                value={examId}
                onChange={e => onExamChange(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">— Select exam —</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title}{e.term ? ` · ${e.term}` : ""}{e.academicYear ? ` (${e.academicYear})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {/* Class */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
            <div className="relative">
              <select
                value={classId}
                onChange={e => onClassChange(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">— Select class —</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.section ? ` ${c.section}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading results…</span>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4">{error}</div>
      )}

      {/* ── Empty prompt ──────────────────────────────────────────── */}
      {!loading && !error && !data && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center text-gray-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Select an exam and class to view results</p>
        </div>
      )}

      {/* ── No marks yet ──────────────────────────────────────────── */}
      {!loading && !error && data && data.summary.markedStudents === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No marks have been entered for this exam and class yet</p>
          <p className="text-xs mt-1">Go to Grade Book to enter marks</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────── */}
      {!loading && !error && data && data.summary.markedStudents > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Class Average", value: `${data.summary.classAvg}%`,
                icon: TrendingUp, color: "bg-indigo-50 text-indigo-600",
                sub: `${data.summary.subjectCount} subjects`,
              },
              {
                label: "Pass Rate", value: `${data.summary.passRate}%`,
                icon: Trophy, color: data.summary.passRate >= 70 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600",
                sub: `Grade 1–8 (≥40%)`,
              },
              {
                label: "Highest Score", value: `${data.summary.highest}%`,
                icon: Medal, color: "bg-emerald-50 text-emerald-600",
                sub: "Top performer",
              },
              {
                label: "Students Marked", value: `${data.summary.markedStudents}/${data.summary.totalStudents}`,
                icon: Users, color: "bg-sky-50 text-sky-600",
                sub: data.summary.markedStudents < data.summary.totalStudents ? "⚠ Some unmarked" : "All marked",
              },
            ].map(card => {
              const Icon = card.icon
              return (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{card.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                </div>
              )
            })}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Subject Averages – horizontal bars */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1">Subject Averages</h2>
              <p className="text-xs text-gray-400 mb-5">Average score per subject</p>
              <div className="space-y-3">
                {data.subjectAverages.map(s => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">{s.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-xs font-bold", scoreColor(s.avg))}>{s.avg}%</span>
                        <span className="text-[10px] text-gray-400">{s.passRate}% pass</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(s.avg / 100) * 100}%`,
                          background: s.avg >= 70
                            ? "linear-gradient(90deg,#10b981,#34d399)"
                            : s.avg >= 50
                            ? "linear-gradient(90deg,#6366f1,#818cf8)"
                            : s.avg >= 40
                            ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                            : "linear-gradient(90deg,#ef4444,#f87171)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grade distribution – vertical bars */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1">Grade Distribution</h2>
              <p className="text-xs text-gray-400 mb-5">Ghana BECE grades (1 = Excellent, 9 = Fail)</p>
              <div className="flex items-end justify-between gap-1.5 h-36">
                {data.gradeDistribution.map(g => (
                  <div key={g.grade} className="flex flex-col items-center gap-1 flex-1">
                    {g.count > 0 && (
                      <span className="text-[10px] font-medium text-gray-600">{g.count}</span>
                    )}
                    <div className="w-full flex items-end" style={{ height: "80px" }}>
                      <div
                        className={cn("w-full rounded-t-lg transition-all duration-500", gradeColor(g.grade))}
                        style={{ height: `${maxGradeBucket > 0 ? (g.count / maxGradeBucket) * 80 : 0}px`, minHeight: g.count > 0 ? "4px" : "0px" }}
                        title={`Grade ${g.grade} – ${g.label}: ${g.count} student${g.count !== 1 ? "s" : ""}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">{g.grade}</span>
                  </div>
                ))}
              </div>
              {/* legend */}
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
                {[
                  { label: "Excellent (1)",   color: "bg-emerald-500" },
                  { label: "Very Good (2)",   color: "bg-green-500" },
                  { label: "Good (3)",        color: "bg-blue-500" },
                  { label: "Credit (4–5)",    color: "bg-indigo-500" },
                  { label: "Pass (6–8)",      color: "bg-amber-400" },
                  { label: "Fail (9)",        color: "bg-red-500" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-sm shrink-0", l.color)} />
                    <span className="text-[10px] text-gray-500">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top students leaderboard */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Top Performers</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ranked by average score across all subjects</p>
              </div>
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 w-12">Rank</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3">Student</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-3 py-3 hidden sm:table-cell">ID</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-3 py-3">Average</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-3 py-3 hidden sm:table-cell">Total</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.topStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      {/* Rank */}
                      <td className="px-5 py-3">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                          s.rank === 1 ? "bg-amber-100 text-amber-700" :
                          s.rank === 2 ? "bg-gray-100 text-gray-600" :
                          s.rank === 3 ? "bg-orange-100 text-orange-700" :
                          "bg-gray-50 text-gray-500"
                        )}>
                          {s.rank}
                        </div>
                      </td>
                      {/* Name */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar photo={s.photo} name={s.name} size={8} />
                          <span className="font-medium text-gray-800 truncate max-w-[140px]">{s.name}</span>
                        </div>
                      </td>
                      {/* Student ID */}
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-400 font-mono">{s.studentId ?? "—"}</span>
                      </td>
                      {/* Average */}
                      <td className="px-3 py-3 text-right">
                        <span className={cn("font-bold", scoreColor(s.avg))}>{s.avg}%</span>
                      </td>
                      {/* Total */}
                      <td className="px-3 py-3 text-right hidden sm:table-cell">
                        <span className="text-gray-600 text-xs">{s.total} / {s.subjects * 100}</span>
                      </td>
                      {/* Grade */}
                      <td className="px-5 py-3 text-right">
                        <span className={cn("text-xs font-bold px-2 py-1 rounded-full", gradePill(s.grade))}>
                          {s.grade} · {s.remark}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.summary.markedStudents > 10 && (
              <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                Showing top 10 of {data.summary.markedStudents} students
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
