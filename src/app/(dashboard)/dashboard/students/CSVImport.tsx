"use client"

import { useState, useRef, useCallback } from "react"
import {
  Upload, X, FileText, AlertCircle, CheckCircle2,
  Loader2, Download, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Class = { id: string; name: string; section: string | null }

interface Props {
  classes: Class[]
  onClose: () => void
  onDone: () => void
}

type CSVRow = Record<string, string>
type ImportResult = { row: number; name: string; status: "ok" | "error"; error?: string }

// Expected CSV columns → internal field name
const COLUMN_MAP: Record<string, string> = {
  name:           "name",
  "full name":    "name",
  "student name": "name",
  email:          "email",
  phone:          "phone",
  "phone number": "phone",
  class:          "className",
  "class name":   "className",
  "roll number":  "rollNumber",
  roll:           "rollNumber",
  "student id":   "studentId",
  "student no":   "studentId",
  gender:         "gender",
  sex:            "gender",
  dob:            "dateOfBirth",
  "date of birth":"dateOfBirth",
  birthday:       "dateOfBirth",
  nationality:    "nationality",
  address:        "address",
  religion:       "religion",
  "blood group":  "bloodGroup",
  blood:          "bloodGroup",
}

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase())
  return lines.slice(1).map(line => {
    // Handle quoted commas
    const values: string[] = []
    let cur = ""; let inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === "," && !inQ) { values.push(cur.trim()); cur = "" }
      else cur += ch
    }
    values.push(cur.trim())

    const row: CSVRow = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? "" })
    return row
  }).filter(r => Object.values(r).some(v => v.trim()))
}

function mapRow(raw: CSVRow): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const [key, val] of Object.entries(raw)) {
    const field = COLUMN_MAP[key.toLowerCase()]
    if (field) mapped[field] = val
    else mapped[key] = val   // keep unknown cols for display
  }
  return mapped
}

const TEMPLATE_CSV = `name,email,phone,class,roll number,student id,gender,date of birth,nationality
Kofi Mensah,kofi@example.com,0501234567,JHS 1 A,001,STD001,Male,2010-05-12,Ghanaian
Ama Owusu,,0507654321,JHS 1 B,002,,Female,2011-03-20,Ghanaian
David Atiah,,,JHS 2 A,003,STD003,Male,,Ghanaian`

export default function CSVImport({ classes, onClose, onDone }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload")
  const [dragging, setDragging] = useState(false)
  const [rawRows, setRawRows] = useState<CSVRow[]>([])
  const [mappedRows, setMappedRows] = useState<Record<string, string>[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [summary, setSummary] = useState({ succeeded: 0, failed: 0 })
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // Column headers from the CSV (raw)
  const rawHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : []

  function loadFile(file: File) {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      setError("Please upload a CSV file (.csv or .txt)")
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      if (rows.length === 0) { setError("No data rows found in file."); return }
      setRawRows(rows)
      setMappedRows(rows.map(mapRow))
      setError("")
      setStep("preview")
    }
    reader.readAsText(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [])

  async function handleImport() {
    setStep("importing")
    setError("")
    try {
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Import failed")
      setResults(data.results)
      setSummary({ succeeded: data.succeeded, failed: data.failed })
      setStep("done")
    } catch (e: any) {
      setError(e.message)
      setStep("preview")
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "students_template.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Import Students from CSV</h2>
            {step !== "upload" && rawRows.length > 0 && (
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {rawRows.length} row{rawRows.length !== 1 ? "s" : ""} detected
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1 px-6 pt-3 shrink-0">
          {["upload", "preview", "done"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                step === s ? "bg-indigo-600 text-white"
                  : (step === "preview" && s === "upload") || step === "done" ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-400"
              )}>
                {((step === "preview" && s === "upload") || (step === "done" && s !== "done")) ? "✓" : i + 1}
              </div>
              <span className={cn("text-xs font-medium capitalize", step === s ? "text-indigo-600" : "text-gray-400")}>
                {s === "upload" ? "Upload" : s === "preview" ? "Preview" : "Done"}
              </span>
              {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 mx-0.5" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── Step 1: Upload ── */}
          {(step === "upload" || step === "preview" && rawRows.length === 0) && (
            <div className="space-y-4">
              {/* Template download */}
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Download template first</p>
                  <p className="text-xs text-indigo-600 mt-0.5">Use our template to ensure correct column names</p>
                </div>
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors",
                  dragging ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                )}
              >
                <Upload className={cn("w-10 h-10 mx-auto mb-3", dragging ? "text-indigo-500" : "text-gray-300")} />
                <p className="font-semibold text-gray-700">Drop your CSV here</p>
                <p className="text-sm text-gray-400 mt-1">or click to browse — CSV or TXT files only</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
              </div>

              {/* Supported columns */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Supported columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {["name *", "email", "phone", "class", "roll number", "student id", "gender", "date of birth", "nationality", "address", "religion", "blood group"].map(col => (
                    <span key={col} className={cn("text-xs px-2 py-0.5 rounded-md font-mono", col.includes("*") ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600")}>
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Default password for all imported students: <span className="font-mono font-bold">changeme123</span></p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === "preview" && rawRows.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Review the first rows below. All <strong>{rawRows.length}</strong> students will be imported. Default password is <span className="font-mono font-bold text-gray-700">changeme123</span>.</p>

              {/* Preview table */}
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold w-8">#</th>
                      {rawHeaders.map(h => (
                        <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">
                          {h}
                          {COLUMN_MAP[h.toLowerCase()] && (
                            <span className="ml-1 text-indigo-400">→ {COLUMN_MAP[h.toLowerCase()]}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rawRows.slice(0, 8).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-300">{i + 1}</td>
                        {rawHeaders.map(h => (
                          <td key={h} className="px-3 py-2 text-gray-700 max-w-[140px] truncate">{row[h] || <span className="text-gray-200 italic">—</span>}</td>
                        ))}
                      </tr>
                    ))}
                    {rawRows.length > 8 && (
                      <tr><td colSpan={rawHeaders.length + 1} className="px-3 py-2 text-center text-gray-400 italic">…and {rawRows.length - 8} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Class lookup notice */}
              {rawRows.some(r => r["class"]) && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                  <strong>Class matching:</strong> classes are matched by name. Available: {classes.map(c => `${c.name}${c.section ? ` ${c.section}` : ""}`).join(", ")}. Unmatched classes will be left blank.
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Change file link */}
              <button onClick={() => { setStep("upload"); setRawRows([]); setMappedRows([]) }} className="text-xs text-indigo-600 hover:underline">
                ← Upload a different file
              </button>
            </div>
          )}

          {/* ── Importing spinner ── */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="font-semibold text-gray-700">Importing {rawRows.length} students…</p>
              <p className="text-sm text-gray-400">This may take a moment</p>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-extrabold text-emerald-700">{summary.succeeded}</p>
                    <p className="text-xs text-emerald-600 font-medium">Imported successfully</p>
                  </div>
                </div>
                <div className={cn("flex items-center gap-3 p-4 border rounded-xl", summary.failed > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100")}>
                  <AlertCircle className={cn("w-8 h-8 shrink-0", summary.failed > 0 ? "text-red-400" : "text-gray-300")} />
                  <div>
                    <p className={cn("text-2xl font-extrabold", summary.failed > 0 ? "text-red-700" : "text-gray-400")}>{summary.failed}</p>
                    <p className={cn("text-xs font-medium", summary.failed > 0 ? "text-red-600" : "text-gray-400")}>Failed / skipped</p>
                  </div>
                </div>
              </div>

              {/* Error rows */}
              {summary.failed > 0 && (
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Rows with errors</p>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                    {results.filter(r => r.status === "error").map(r => (
                      <div key={r.row} className="flex items-start gap-2 px-4 py-2.5">
                        <span className="text-xs text-gray-400 w-8 shrink-0">#{r.row}</span>
                        <span className="text-xs font-medium text-gray-700 flex-1">{r.name || "—"}</span>
                        <span className="text-xs text-red-600">{r.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary.succeeded > 0 && (
                <p className="text-sm text-gray-500 text-center">
                  Students can now log in with password <span className="font-mono font-bold text-gray-700">changeme123</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
          {step === "done" ? (
            <>
              <span />
              <button onClick={onDone} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                Done — View Students
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
              {step === "preview" && rawRows.length > 0 && (
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Import {rawRows.length} Students
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
