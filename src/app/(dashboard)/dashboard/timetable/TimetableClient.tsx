"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, CalendarDays, Printer, X, Loader2 } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import ConfirmModal from "@/components/dashboard/ConfirmModal"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
type ClassItem    = { id: string; name: string; section: string | null }
type SubjectItem  = { id: string; title: string; code: string | null; group: string | null }
type TeacherItem  = { id: string; user: { name: string } }

type Routine = {
  id: string
  classId: string
  subjectId: string
  teacherId: string | null
  day: DayOfWeek
  startTime: string
  endTime: string
  room: string | null
  subject: SubjectItem
}

type DayOfWeek = "MONDAY"|"TUESDAY"|"WEDNESDAY"|"THURSDAY"|"FRIDAY"|"SATURDAY"|"SUNDAY"

interface Props {
  classes:     ClassItem[]
  subjects:    SubjectItem[]
  teachers:    TeacherItem[]
  canEdit:     boolean
  myTeacherId: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const WEEK_DAYS: DayOfWeek[] = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]
const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
}
const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
}

// Deterministic color per subject id
const SUBJECT_COLORS = [
  { bg: "bg-indigo-100",  text: "text-indigo-800",  border: "border-indigo-200"  },
  { bg: "bg-emerald-100", text: "text-emerald-800",  border: "border-emerald-200" },
  { bg: "bg-amber-100",   text: "text-amber-800",    border: "border-amber-200"   },
  { bg: "bg-rose-100",    text: "text-rose-800",     border: "border-rose-200"    },
  { bg: "bg-sky-100",     text: "text-sky-800",      border: "border-sky-200"     },
  { bg: "bg-violet-100",  text: "text-violet-800",   border: "border-violet-200"  },
  { bg: "bg-orange-100",  text: "text-orange-800",   border: "border-orange-200"  },
  { bg: "bg-teal-100",    text: "text-teal-800",     border: "border-teal-200"    },
  { bg: "bg-pink-100",    text: "text-pink-800",     border: "border-pink-200"    },
  { bg: "bg-lime-100",    text: "text-lime-800",     border: "border-lime-200"    },
]

function subjectColorIdx(id: string) {
  return id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % SUBJECT_COLORS.length
}

const emptyForm = {
  day: "MONDAY" as DayOfWeek,
  subjectId: "",
  teacherId: "",
  startTime: "07:00",
  endTime: "07:40",
  room: "",
}

// ─── Period Card ──────────────────────────────────────────────────────────────
function PeriodCard({
  routine, teachers, canEdit, onEdit, onDelete,
}: {
  routine: Routine
  teachers: TeacherItem[]
  canEdit: boolean
  onEdit: (r: Routine) => void
  onDelete: (r: Routine) => void
}) {
  const ci = subjectColorIdx(routine.subjectId)
  const c  = SUBJECT_COLORS[ci]
  const teacher = teachers.find(t => t.id === routine.teacherId)

  return (
    <div className={cn(
      "rounded-xl border p-2.5 relative group transition-all",
      c.bg, c.border
    )}>
      <p className={cn("text-xs font-bold leading-snug truncate", c.text)}>
        {routine.subject.title}
      </p>
      <p className="text-[10px] text-gray-500 mt-0.5">
        {routine.startTime} – {routine.endTime}
      </p>
      {teacher && (
        <p className="text-[10px] text-gray-500 truncate">{teacher.user.name}</p>
      )}
      {routine.room && (
        <p className="text-[10px] text-gray-400 truncate">Room: {routine.room}</p>
      )}
      {canEdit && (
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(routine)}
            className="w-5 h-5 bg-white rounded flex items-center justify-center text-gray-500 hover:text-indigo-600 shadow-sm"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(routine)}
            className="w-5 h-5 bg-white rounded flex items-center justify-center text-gray-500 hover:text-red-500 shadow-sm"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TimetableClient({ classes, subjects, teachers, canEdit, myTeacherId }: Props) {
  const [classId,    setClassId]    = useState(classes[0]?.id ?? "")
  const [viewMode,   setViewMode]   = useState<"class"|"mine">(myTeacherId ? "mine" : "class")
  const [routines,   setRoutines]   = useState<Routine[]>([])
  const [loading,    setLoading]    = useState(false)
  const [openModal,  setOpenModal]  = useState(false)
  const [editTarget, setEditTarget] = useState<Routine | null>(null)
  const [form,       setForm]       = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState("")
  const [confirmDel, setConfirmDel] = useState<Routine | null>(null)
  const [addDay,     setAddDay]     = useState<DayOfWeek | null>(null)

  // Fetch routines
  const fetchRoutines = useCallback(async () => {
    setLoading(true)
    try {
      const qs = viewMode === "mine" && myTeacherId
        ? `teacherId=${myTeacherId}`
        : `classId=${classId}`
      const res = await fetch(`/api/class-routines?${qs}`)
      const data = await res.json()
      setRoutines(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [classId, viewMode, myTeacherId])

  useEffect(() => { fetchRoutines() }, [fetchRoutines])

  // Group by day
  const byDay = WEEK_DAYS.reduce((acc, day) => {
    acc[day] = routines
      .filter(r => r.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    return acc
  }, {} as Record<DayOfWeek, Routine[]>)

  function openAdd(day: DayOfWeek) {
    setEditTarget(null)
    setForm({ ...emptyForm, day })
    setAddDay(day)
    setError("")
    setOpenModal(true)
  }

  function openEdit(r: Routine) {
    setEditTarget(r)
    setForm({
      day: r.day,
      subjectId: r.subjectId,
      teacherId: r.teacherId ?? "",
      startTime: r.startTime,
      endTime: r.endTime,
      room: r.room ?? "",
    })
    setError("")
    setOpenModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError("")
    try {
      if (editTarget) {
        const res = await fetch(`/api/class-routines/${editTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated: Routine = await res.json()
        setRoutines(prev => prev.map(r => r.id === editTarget.id ? updated : r))
      } else {
        const res = await fetch("/api/class-routines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, classId }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const created: Routine = await res.json()
        setRoutines(prev => [...prev, created])
      }
      setOpenModal(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(r: Routine) {
    await fetch(`/api/class-routines/${r.id}`, { method: "DELETE" })
    setRoutines(prev => prev.filter(p => p.id !== r.id))
    setConfirmDel(null)
  }

  function handlePrint() {
    const cls = classes.find(c => c.id === classId)
    const title = cls ? `${cls.name}${cls.section ? ` ${cls.section}` : ""} Timetable` : "Class Timetable"
    const html = buildPrintHtml(title, byDay, teachers, routines.length === 0)
    const win = window.open("", "_blank", "width=900,height=650")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.onload = () => win.print()
  }

  const selectedClass = classes.find(c => c.id === classId)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timetable"
        description="Weekly class schedule"
        action={canEdit ? (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        ) : undefined}
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {myTeacherId && (
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => setViewMode("mine")}
              className={cn("px-4 py-2 font-medium transition-colors",
                viewMode === "mine" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50")}
            >
              My Schedule
            </button>
            <button
              onClick={() => setViewMode("class")}
              className={cn("px-4 py-2 font-medium transition-colors",
                viewMode === "class" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50")}
            >
              Class View
            </button>
          </div>
        )}

        {(viewMode === "class" || !myTeacherId) && (
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {classes.length === 0 && <option value="">No classes</option>}
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.section ? ` ${c.section}` : ""}
              </option>
            ))}
          </select>
        )}

        {viewMode === "mine" && myTeacherId && (
          <span className="text-sm text-gray-500">Showing periods where you are assigned</span>
        )}
      </div>

      {/* Weekly Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* Desktop: 5 columns */}
          <div className="hidden md:grid grid-cols-5 gap-3">
            {WEEK_DAYS.map(day => (
              <div key={day} className="space-y-2">
                {/* Day header */}
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-center border border-gray-100">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {DAY_LABELS[day]}
                  </p>
                  <p className="text-xs text-gray-400">{byDay[day].length} period{byDay[day].length !== 1 ? "s" : ""}</p>
                </div>

                {/* Periods */}
                {byDay[day].length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-6 flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-400">Free</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {byDay[day].map(r => (
                      <PeriodCard
                        key={r.id}
                        routine={r}
                        teachers={teachers}
                        canEdit={canEdit}
                        onEdit={openEdit}
                        onDelete={r => setConfirmDel(r)}
                      />
                    ))}
                  </div>
                )}

                {canEdit && viewMode === "class" && (
                  <button
                    onClick={() => openAdd(day)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-indigo-600 rounded-xl border border-dashed border-indigo-200 hover:bg-indigo-50 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Mobile: stacked */}
          <div className="md:hidden space-y-4">
            {WEEK_DAYS.map(day => (
              <div key={day} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{DAY_LABELS[day]}</p>
                    <p className="text-xs text-gray-400">{byDay[day].length} period{byDay[day].length !== 1 ? "s" : ""}</p>
                  </div>
                  {canEdit && viewMode === "class" && (
                    <button
                      onClick={() => openAdd(day)}
                      className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  {byDay[day].length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No periods</p>
                  ) : byDay[day].map(r => (
                    <PeriodCard
                      key={r.id}
                      routine={r}
                      teachers={teachers}
                      canEdit={canEdit}
                      onEdit={openEdit}
                      onDelete={r => setConfirmDel(r)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {routines.length === 0 && !loading && (
            <div className="flex flex-col items-center py-14 text-center">
              <CalendarDays className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No timetable yet</p>
              {canEdit && viewMode === "class" && (
                <p className="text-xs text-gray-400 mt-1">Click "+ Add" under any day to create periods</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editTarget ? "Edit Period" : `Add Period — ${addDay ? DAY_LABELS[addDay] : ""}`}
              </h2>
              <button onClick={() => setOpenModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
              )}

              {editTarget && (
                <div>
                  <label className="label">Day</label>
                  <select className="input" value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value as DayOfWeek }))}>
                    {WEEK_DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Subject *</label>
                <select className="input" required value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                  <option value="">— Select subject —</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.title}{s.code ? ` (${s.code})` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Teacher</label>
                <select className="input" value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}>
                  <option value="">— Unassigned —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.user.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Time *</label>
                  <input className="input" type="time" required value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End Time *</label>
                  <input className="input" type="time" required value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="label">Room / Location</label>
                <input className="input" value={form.room} placeholder="e.g. Block A, Room 12"
                  onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpenModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? "Saving…" : editTarget ? "Update" : "Add Period"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.5rem 0.875rem; font-size: 0.875rem; outline: none; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>

      <ConfirmModal
        open={!!confirmDel}
        message={confirmDel ? `Delete "${confirmDel.subject.title}" on ${DAY_LABELS[confirmDel.day]}?` : ""}
        onConfirm={() => confirmDel && handleDelete(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}

// ─── Print HTML builder ───────────────────────────────────────────────────────
function buildPrintHtml(
  title: string,
  byDay: Record<DayOfWeek, Routine[]>,
  teachers: TeacherItem[],
  empty: boolean,
): string {
  const DAYS: DayOfWeek[] = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]
  const DAY_LABELS: Record<DayOfWeek, string> = {
    MONDAY:"Monday",TUESDAY:"Tuesday",WEDNESDAY:"Wednesday",THURSDAY:"Thursday",FRIDAY:"Friday",SATURDAY:"Saturday",SUNDAY:"Sunday"
  }

  const rows = DAYS.map(day => {
    const periods = byDay[day]
    const cells = periods.length === 0
      ? `<td style="color:#9ca3af;font-style:italic;padding:8px 10px;font-size:12px;border:1px solid #e5e7eb;">Free</td>`
      : `<td style="padding:6px 8px;border:1px solid #e5e7eb;vertical-align:top;">` +
          periods.map(p => {
            const t = teachers.find(t => t.id === p.teacherId)
            return `<div style="margin-bottom:6px;padding:6px 8px;background:#f3f4f6;border-radius:6px;">
              <strong style="font-size:12px;">${p.subject.title}</strong><br>
              <span style="font-size:11px;color:#6b7280;">${p.startTime} – ${p.endTime}</span>
              ${t ? `<br><span style="font-size:11px;color:#6b7280;">${t.user.name}</span>` : ""}
              ${p.room ? `<br><span style="font-size:11px;color:#9ca3af;">Room: ${p.room}</span>` : ""}
            </div>`
          }).join("") +
        `</td>`

    return `<tr>
      <td style="font-weight:600;font-size:12px;padding:8px 10px;border:1px solid #e5e7eb;white-space:nowrap;background:#f9fafb;">${DAY_LABELS[day]}</td>
      ${cells}
    </tr>`
  }).join("")

  return `<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    p { font-size: 12px; color: #6b7280; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; }
    @media print { button { display: none; } }
  </style></head>
  <body>
    <h1>${title}</h1>
    <p>Printed on ${new Date().toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" })}</p>
    ${empty ? "<p>No periods scheduled.</p>" : `<table>${rows}</table>`}
  </body></html>`
}
