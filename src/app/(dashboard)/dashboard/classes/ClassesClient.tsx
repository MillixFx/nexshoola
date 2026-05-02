"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, BookOpen, UserCheck, X, Loader2, ListChecks, Save } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import ConfirmModal from "@/components/dashboard/ConfirmModal"
import { cn } from "@/lib/utils"

type Teacher = { id: string; user: { name: string } }
type Subject = { id: string; title: string; code: string | null; group: string | null; isOptional: boolean }

type ClassWithDetails = {
  id: string
  name: string
  section: string | null
  code: string | null
  capacity: number | null
  _count: { students: number }
  classTeacher: { id: string; user: { name: string } } | null
}

const emptyForm = { name: "", section: "", code: "", capacity: "" }

// Row returned by GET /api/class-subjects
type ClassSubjectRow = {
  id: string
  subjectId: string
  teacherId: string | null
  subject: Subject
}

interface Props {
  classes: ClassWithDetails[]
  teachers: Teacher[]
  subjects: Subject[]
  schoolId: string
}

export default function ClassesClient({ classes: initial, teachers, subjects, schoolId }: Props) {
  const [classes, setClasses] = useState(initial)

  // Add/Edit class modal
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ClassWithDetails | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Assign class master modal
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigningClass, setAssigningClass] = useState<ClassWithDetails | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState("")

  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // Subject assignments modal
  const [subjectOpen, setSubjectOpen]           = useState(false)
  const [subjectClass, setSubjectClass]         = useState<ClassWithDetails | null>(null)
  const [classSubjects, setClassSubjects]       = useState<ClassSubjectRow[]>([])
  const [loadingSubjects, setLoadingSubjects]   = useState(false)
  // Local editing state: subjectId → teacherId | null | undefined (undefined = not assigned to class)
  const [assignments, setAssignments]           = useState<Record<string, string | null>>({})
  const [savingSubjects, setSavingSubjects]     = useState(false)
  const [subjectError, setSubjectError]         = useState("")

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  function openAdd() { setEditing(null); setForm(emptyForm); setError(""); setOpen(true) }
  function openEdit(c: ClassWithDetails) {
    setEditing(c)
    setForm({ name: c.name, section: c.section ?? "", code: c.code ?? "", capacity: c.capacity ? String(c.capacity) : "" })
    setError(""); setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      if (editing) {
        const res = await fetch(`/api/classes/${editing.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setClasses(prev => prev.map(c => c.id === editing.id ? updated : c))
      } else {
        const res = await fetch("/api/classes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, schoolId }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const created = await res.json()
        setClasses(prev => [...prev, created])
      }
      setOpen(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  function handleDelete(id: string) {
    setConfirmModal({
      message: "Delete this class? All linked data (attendance, marks, fees) will also be deleted.",
      onConfirm: async () => {
        await fetch(`/api/classes/${id}`, { method: "DELETE" })
        setClasses(prev => prev.filter(c => c.id !== id))
      }
    })
  }

  // ── Assign class master ───────────────────────────────────────────────────
  function openAssign(c: ClassWithDetails) {
    setAssigningClass(c)
    setSelectedTeacherId(c.classTeacher?.id ?? "")
    setAssignError(""); setAssignOpen(true)
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault(); setAssigning(true); setAssignError("")
    try {
      const res = await fetch(`/api/classes/${assigningClass!.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classTeacherId: selectedTeacherId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await res.json()
      setClasses(prev => prev.map(c => c.id === updated.id ? updated : c))
      setAssignOpen(false)
    } catch (err: any) { setAssignError(err.message) } finally { setAssigning(false) }
  }

  // ── Subject assignments ───────────────────────────────────────────────────
  function openSubjects(c: ClassWithDetails) {
    setSubjectClass(c)
    setSubjectError("")
    setSubjectOpen(true)
    setLoadingSubjects(true)
    fetch(`/api/class-subjects?classId=${c.id}`)
      .then(r => r.json())
      .then((rows: ClassSubjectRow[]) => {
        setClassSubjects(rows)
        // Build assignment map from existing rows
        const map: Record<string, string | null> = {}
        rows.forEach(r => { map[r.subjectId] = r.teacherId })
        setAssignments(map)
      })
      .finally(() => setLoadingSubjects(false))
  }

  function toggleSubject(subjectId: string, checked: boolean) {
    setAssignments(prev => {
      const next = { ...prev }
      if (checked) {
        // Add to class, default to class master if available
        next[subjectId] = subjectClass?.classTeacher?.id ?? null
      } else {
        delete next[subjectId]
      }
      return next
    })
  }

  function setTeacher(subjectId: string, teacherId: string) {
    setAssignments(prev => ({ ...prev, [subjectId]: teacherId || null }))
  }

  function assignAllToClassMaster() {
    if (!subjectClass?.classTeacher) return
    setAssignments(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(sid => { next[sid] = subjectClass.classTeacher!.id })
      return next
    })
  }

  async function saveSubjects() {
    if (!subjectClass) return
    setSavingSubjects(true); setSubjectError("")
    try {
      const res = await fetch("/api/class-subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: subjectClass.id,
          assignments: Object.entries(assignments).map(([subjectId, teacherId]) => ({
            subjectId, teacherId: teacherId || null,
          })),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated: ClassSubjectRow[] = await res.json()
      setClassSubjects(updated)
      setSubjectOpen(false)
    } catch (err: any) { setSubjectError(err.message) } finally { setSavingSubjects(false) }
  }

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns: Column<ClassWithDetails>[] = [
    {
      key: "name", label: "Class Name", primary: true,
      render: c => (
        <span className="font-medium text-gray-900">
          {c.name}{c.section ? ` — ${c.section}` : ""}
        </span>
      ),
    },
    { key: "code", label: "Code", render: c => c.code ?? "—" },
    {
      key: "classTeacher", label: "Class Master",
      render: c => c.classTeacher
        ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-[10px] font-bold shrink-0">
              {c.classTeacher.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <span className="text-sm text-gray-800 font-medium">{c.classTeacher.user.name}</span>
          </div>
        )
        : <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Unassigned</span>,
    },
    {
      key: "students", label: "Enrollment",
      render: c => {
        const count = c._count.students
        const cap = c.capacity
        if (!cap) return <span className="font-semibold text-indigo-600">{count} enrolled</span>
        const pct = Math.min(100, Math.round((count / cap) * 100))
        const color = pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-amber-400" : "bg-emerald-500"
        const textColor = pct >= 100 ? "text-red-600" : pct >= 85 ? "text-amber-600" : "text-emerald-600"
        return (
          <div className="min-w-[120px]">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold ${textColor}`}>{count} / {cap}</span>
              <span className="text-[10px] text-gray-400">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description={`${classes.length} class${classes.length !== 1 ? "es" : ""}`}
        action={
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Class
          </button>
        }
      />

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-base font-bold text-gray-800 mb-1">No classes yet</h2>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Class</button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={classes}
          keyField="id"
          viewKey="classes"
          searchPlaceholder="Search classes…"
          searchKeys={["name", "code"]}
          actions={(c) => (
            <div className="flex gap-1 justify-end">
              <button
                onClick={() => openSubjects(c)}
                className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                title="Manage Subjects & Teachers"
              >
                <ListChecks className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openAssign(c)}
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Assign Class Master"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openEdit(c)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        />
      )}

      {/* ── Add / Edit Class Modal ─────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Class" : "Add Class"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div>
                <label className="label">Class Name *</label>
                <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="JHS 1" />
              </div>
              <div>
                <label className="label">Section / Arm</label>
                <input className="input" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="A, B, Gold…" />
              </div>
              <div>
                <label className="label">Class Code</label>
                <input className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="JHS1A" />
              </div>
              <div>
                <label className="label">Capacity</label>
                <input className="input" type="number" min="0" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="40" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Update" : "Add Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Class Master Modal ─────────────────────────────────────── */}
      {assignOpen && assigningClass && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Assign Class Master</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {assigningClass.name}{assigningClass.section ? ` — ${assigningClass.section}` : ""}
                </p>
              </div>
              <button onClick={() => setAssignOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-5 space-y-4">
              {assignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{assignError}</div>
              )}
              <div>
                <label className="label">Select Teacher</label>
                <select
                  className="input"
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                >
                  <option value="">— Remove class master —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.user.name}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-gray-400">
                  The class master is responsible for marking attendance. Selecting "Remove" unassigns the current master.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAssignOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={assigning} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {assigning ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><UserCheck className="w-4 h-4" /> Assign</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manage Subjects & Teachers Modal ─────────────────────────────── */}
      {subjectOpen && subjectClass && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Subjects & Teachers
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {subjectClass.name}{subjectClass.section ? ` — ${subjectClass.section}` : ""}
                  {subjectClass.classTeacher && (
                    <span className="ml-2 text-emerald-600 font-medium">
                      · Class Master: {subjectClass.classTeacher.user.name}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setSubjectOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {subjectError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{subjectError}</div>
              )}

              {loadingSubjects ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : subjects.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  No subjects created yet. Add subjects first from the Subjects page.
                </div>
              ) : (
                <>
                  {/* Quick-assign helper */}
                  {subjectClass.classTeacher && Object.keys(assignments).length > 0 && (
                    <div className="mb-4 flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                      <p className="text-xs text-emerald-700 font-medium">
                        Assign all subjects to the class master ({subjectClass.classTeacher.user.name})?
                      </p>
                      <button
                        onClick={assignAllToClassMaster}
                        className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Assign All
                      </button>
                    </div>
                  )}

                  {/* Subject list */}
                  <div className="space-y-2">
                    {subjects.map(subject => {
                      const isAssigned = subject.id in assignments
                      const teacherId  = assignments[subject.id] ?? ""
                      return (
                        <div
                          key={subject.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                            isAssigned ? "bg-indigo-50/60 border-indigo-100" : "bg-gray-50 border-gray-100"
                          )}
                        >
                          {/* Toggle checkbox */}
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={e => toggleSubject(subject.id, e.target.checked)}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                          />

                          {/* Subject info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn("text-sm font-semibold", isAssigned ? "text-gray-900" : "text-gray-400")}>
                                {subject.title}
                              </span>
                              {subject.code && (
                                <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                  {subject.code}
                                </span>
                              )}
                              {subject.isOptional && (
                                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                                  Elective
                                </span>
                              )}
                              {subject.group && (
                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                                  {subject.group}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Teacher dropdown — only shown when subject is assigned to class */}
                          {isAssigned && (
                            <select
                              value={teacherId}
                              onChange={e => setTeacher(subject.id, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-400 bg-white min-w-[160px] shrink-0"
                            >
                              <option value="">— No teacher assigned —</option>
                              {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.user.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <p className="mt-3 text-xs text-gray-400">
                    {Object.keys(assignments).length} of {subjects.length} subjects assigned to this class.
                  </p>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setSubjectOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSubjects}
                disabled={savingSubjects}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingSubjects
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Save className="w-4 h-4" /> Save Assignments</>
                }
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
