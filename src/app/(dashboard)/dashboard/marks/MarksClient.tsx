"use client"

import { useState, useCallback, useRef } from "react"
import { Loader2, BookOpenCheck, Check, AlertCircle, Download } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { cn } from "@/lib/utils"
import { ghanaGrade, ghanaGradeColor, ghanaRemark } from "@/lib/grading"

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassItem = { id: string; name: string; section: string | null }
type ExamItem  = { id: string; title: string; term: string | null; academicYear: string | null }

type Student = {
  id: string
  user: { name: string }
  photo: string | null
  rollNumber: string | null
  studentId: string | null
}
type Subject = { id: string; title: string }
type MarkRow  = { studentId: string; subjectId: string; marks: number; grade: string | null }

type CellState = "idle" | "saving" | "saved" | "error"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellKey(studentId: string, subjectId: string) {
  return `${studentId}::${subjectId}`
}

function Avatar({ photo, name }: { photo: string | null; name: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  if (photo) {
    return <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" />
  }
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
      {initials}
    </div>
  )
}

function GhanaGradePill({ score }: { score: number }) {
  const g = ghanaGrade(score)
  const colorMap: Record<number, string> = {
    1: "bg-emerald-100 text-emerald-800",
    2: "bg-green-100 text-green-800",
    3: "bg-blue-100 text-blue-800",
    4: "bg-indigo-100 text-indigo-800",
    5: "bg-indigo-100 text-indigo-800",
    6: "bg-amber-100 text-amber-800",
    7: "bg-amber-100 text-amber-800",
    8: "bg-orange-100 text-orange-800",
    9: "bg-red-100 text-red-800",
  }
  return (
    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", colorMap[g])}>
      {g}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarksClient({
  classes, exams, canEdit,
}: {
  classes: ClassItem[]
  exams: ExamItem[]
  canEdit: boolean
}) {
  const [classId, setClassId] = useState("")
  const [examId,  setExamId]  = useState("")

  const [loading,  setLoading]  = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  // marks[studentId][subjectId] = score value (as string for input)
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({})
  // cell save state
  const [cellStates, setCellStates] = useState<Record<string, CellState>>({})
  const [error, setError] = useState("")

  // debounce timers per cell
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Load grid ───────────────────────────────────────────────────────────────

  async function loadGrid(cId: string, eId: string) {
    if (!cId || !eId) return
    setLoading(true); setError(""); setStudents([]); setSubjects([]); setMarks({})
    try {
      const res = await fetch(`/api/marks?classId=${cId}&examId=${eId}`)
      if (!res.ok) throw new Error((await res.json()).error)
      const data: { students: Student[]; subjects: Subject[]; marks: MarkRow[] } = await res.json()

      setStudents(data.students)
      setSubjects(data.subjects)

      // Build marks map
      const map: Record<string, Record<string, string>> = {}
      for (const s of data.students) {
        map[s.id] = {}
        for (const sub of data.subjects) {
          map[s.id][sub.id] = ""
        }
      }
      for (const m of data.marks) {
        if (!map[m.studentId]) map[m.studentId] = {}
        map[m.studentId][m.subjectId] = String(m.marks)
      }
      setMarks(map)
    } catch (e: any) {
      setError(e.message || "Failed to load grade book")
    } finally {
      setLoading(false)
    }
  }

  function handleClassChange(cId: string) {
    setClassId(cId)
    loadGrid(cId, examId)
  }
  function handleExamChange(eId: string) {
    setExamId(eId)
    loadGrid(classId, eId)
  }

  // ── Save a single cell ──────────────────────────────────────────────────────

  const saveCell = useCallback(async (studentId: string, subjectId: string, value: string) => {
    const key = cellKey(studentId, subjectId)
    if (value === "") return // blank = skip

    const score = parseFloat(value)
    if (isNaN(score) || score < 0 || score > 100) {
      setCellStates(s => ({ ...s, [key]: "error" }))
      return
    }

    setCellStates(s => ({ ...s, [key]: "saving" }))
    try {
      const res = await fetch("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, subjectId, examId, marks: score }),
      })
      if (!res.ok) throw new Error()
      setCellStates(s => ({ ...s, [key]: "saved" }))
      // fade saved indicator after 2 s
      setTimeout(() => setCellStates(s => ({ ...s, [key]: "idle" })), 2000)
    } catch {
      setCellStates(s => ({ ...s, [key]: "error" }))
    }
  }, [examId])

  function handleCellChange(studentId: string, subjectId: string, value: string) {
    // Update local state immediately
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectId]: value },
    }))
    const key = cellKey(studentId, subjectId)
    // Debounce save by 600 ms
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => saveCell(studentId, subjectId, value), 600)
  }

  function handleCellBlur(studentId: string, subjectId: string, value: string) {
    const key = cellKey(studentId, subjectId)
    clearTimeout(timers.current[key])
    saveCell(studentId, subjectId, value)
  }

  // ── Row stats ───────────────────────────────────────────────────────────────

  function rowStats(studentId: string) {
    const vals = subjects
      .map(s => parseFloat(marks[studentId]?.[s.id] ?? ""))
      .filter(v => !isNaN(v))
    if (!vals.length) return { average: null, filled: 0 }
    const average = vals.reduce((a, b) => a + b, 0) / vals.length
    return { average, filled: vals.length }
  }

  // ── Column averages ─────────────────────────────────────────────────────────

  function colAverage(subjectId: string) {
    const vals = students
      .map(s => parseFloat(marks[s.id]?.[subjectId] ?? ""))
      .filter(v => !isNaN(v))
    if (!vals.length) return null
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  // ── Export to CSV ──────────────────────────────────────────────────────────

  function exportCsv() {
    const cls = classes.find(c => c.id === classId)
    const ex  = exams.find(e => e.id === examId)
    const header = ["Student", "Student ID", ...subjects.map(s => s.title), "Average", "Grade"]
    const rows = students.map(st => {
      const { average } = rowStats(st.id)
      const subScores = subjects.map(s => marks[st.id]?.[s.id] ?? "")
      return [
        st.user.name,
        st.studentId ?? "",
        ...subScores,
        average != null ? average.toFixed(1) : "",
        average != null ? ghanaGrade(average) : "",
      ]
    })
    const csv = [header, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `marks_${cls?.name ?? "class"}_${ex?.title ?? "exam"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const hasData = students.length > 0 && subjects.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade Book"
        description="Enter and manage student marks per class and exam"
      />

      {/* ── Selectors ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Class *</label>
            <select
              value={classId}
              onChange={e => handleClassChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
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
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Examination *</label>
            <select
              value={examId}
              onChange={e => handleExamChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select exam —</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title}{e.term ? ` — ${e.term}` : ""}{e.academicYear ? ` (${e.academicYear})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasData && (
          <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-700">{students.length}</span> student{students.length !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-gray-700">{subjects.length}</span> subject{subjects.length !== 1 ? "s" : ""}
              {canEdit && <span className="text-gray-400"> — scores auto-save as you type</span>}
            </p>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {/* ── Empty prompt ─────────────────────────────────────────────────────── */}
      {!loading && !hasData && classId && examId && !error && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <BookOpenCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No students or subjects found for this class.</p>
          <p className="text-xs text-gray-300 mt-1">
            Make sure students are enrolled and subjects are assigned to the class.
          </p>
        </div>
      )}

      {/* ── Grade Book Grid ──────────────────────────────────────────────────── */}
      {!loading && hasData && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Ghana grade legend */}
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mr-1">Grade:</span>
            {([
              [1, "bg-emerald-100 text-emerald-800", "80–100"],
              [2, "bg-green-100 text-green-800",     "70–79"],
              [3, "bg-blue-100 text-blue-800",       "60–69"],
              [4, "bg-indigo-100 text-indigo-800",   "55–59"],
              [5, "bg-indigo-100 text-indigo-800",   "50–54"],
              [6, "bg-amber-100 text-amber-800",     "45–49"],
              [7, "bg-amber-100 text-amber-800",     "40–44"],
              [8, "bg-orange-100 text-orange-800",   "35–39"],
              [9, "bg-red-100 text-red-800",         "0–34"],
            ] as [number, string, string][]).map(([g, cls, range]) => (
              <span key={g} className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", cls)}>
                {g} <span className="font-normal opacity-70">({range})</span>
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {/* Student column */}
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px] border-r border-gray-100">
                    Student
                  </th>

                  {/* Subject columns */}
                  {subjects.map(sub => (
                    <th
                      key={sub.id}
                      className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[110px]"
                    >
                      <span className="block truncate max-w-[100px] mx-auto" title={sub.title}>
                        {sub.title}
                      </span>
                    </th>
                  ))}

                  {/* Average & Grade */}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-indigo-600 uppercase tracking-wider min-w-[80px] border-l border-gray-100">
                    Avg
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-indigo-600 uppercase tracking-wider min-w-[70px]">
                    Grade
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {students.map((st, idx) => {
                  const { average, filled } = rowStats(st.id)
                  return (
                    <tr
                      key={st.id}
                      className={cn("hover:bg-indigo-50/30 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-gray-50/40")}
                    >
                      {/* Student name */}
                      <td className="sticky left-0 z-10 px-4 py-2.5 border-r border-gray-100 bg-inherit">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar photo={st.photo} name={st.user.name} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{st.user.name}</p>
                            {(st.rollNumber || st.studentId) && (
                              <p className="text-[10px] text-gray-400">
                                {st.rollNumber ? `#${st.rollNumber}` : st.studentId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Score cells */}
                      {subjects.map(sub => {
                        const key  = cellKey(st.id, sub.id)
                        const val  = marks[st.id]?.[sub.id] ?? ""
                        const cst  = cellStates[key] ?? "idle"
                        const score = parseFloat(val)
                        const hasScore = val !== "" && !isNaN(score)

                        return (
                          <td key={sub.id} className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {/* Input or read-only value */}
                              <div className="relative">
                                {canEdit ? (
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.5}
                                    value={val}
                                    onChange={e => handleCellChange(st.id, sub.id, e.target.value)}
                                    onBlur={e => handleCellBlur(st.id, sub.id, e.target.value)}
                                    placeholder="—"
                                    className={cn(
                                      "w-16 text-center text-sm font-semibold rounded-xl border py-1.5 px-1 outline-none transition-all",
                                      "focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400",
                                      cst === "error"
                                        ? "border-red-300 bg-red-50 text-red-700"
                                        : cst === "saved"
                                        ? "border-emerald-300 bg-emerald-50"
                                        : hasScore
                                        ? cn("border-gray-200", ghanaGradeColor(score))
                                        : "border-gray-200 bg-white text-gray-400"
                                    )}
                                  />
                                ) : (
                                  <div className={cn(
                                    "w-16 text-center text-sm font-semibold py-1.5",
                                    hasScore ? ghanaGradeColor(score) : "text-gray-300"
                                  )}>
                                    {hasScore ? score : "—"}
                                  </div>
                                )}

                                {/* Save indicator overlay */}
                                {cst === "saving" && (
                                  <Loader2 className="absolute -right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-400 animate-spin" />
                                )}
                                {cst === "saved" && (
                                  <Check className="absolute -right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500" />
                                )}
                              </div>

                              {/* Ghana grade pill */}
                              {hasScore && <GhanaGradePill score={score} />}
                            </div>
                          </td>
                        )
                      })}

                      {/* Row average */}
                      <td className="px-3 py-2 text-center border-l border-gray-100">
                        {average != null ? (
                          <span className={cn("text-sm font-extrabold", ghanaGradeColor(average))}>
                            {average.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                        {filled > 0 && filled < subjects.length && (
                          <span className="block text-[9px] text-gray-300">{filled}/{subjects.length}</span>
                        )}
                      </td>

                      {/* Row grade */}
                      <td className="px-3 py-2 text-center">
                        {average != null ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <GhanaGradePill score={average} />
                            <span className={cn("text-[9px]", ghanaGradeColor(average))}>
                              {ghanaRemark(average)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* ── Footer: column averages ─────────────────────────────────── */}
              <tfoot>
                <tr className="border-t-2 border-indigo-100 bg-indigo-50">
                  <td className="sticky left-0 z-10 bg-indigo-50 px-4 py-2.5 border-r border-indigo-100">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Class Avg</span>
                  </td>
                  {subjects.map(sub => {
                    const avg = colAverage(sub.id)
                    return (
                      <td key={sub.id} className="px-2 py-2 text-center">
                        {avg != null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn("text-sm font-extrabold", ghanaGradeColor(avg))}>
                              {avg.toFixed(1)}
                            </span>
                            <GhanaGradePill score={avg} />
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                    )
                  })}
                  {/* overall class average */}
                  {(() => {
                    const allScores = students.flatMap(st =>
                      subjects.map(sub => parseFloat(marks[st.id]?.[sub.id] ?? "")).filter(v => !isNaN(v))
                    )
                    const overall = allScores.length
                      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
                      : null
                    return (
                      <>
                        <td className="px-3 py-2 text-center border-l border-indigo-100">
                          {overall != null ? (
                            <span className={cn("text-sm font-extrabold", ghanaGradeColor(overall))}>
                              {overall.toFixed(1)}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {overall != null ? <GhanaGradePill score={overall} /> : <span className="text-gray-300">—</span>}
                        </td>
                      </>
                    )
                  })()}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
