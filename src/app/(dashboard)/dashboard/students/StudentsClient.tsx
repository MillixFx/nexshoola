"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Plus, Pencil, Trash2, Users, Eye, Camera,
  Search, Loader2, X, CreditCard, ChevronDown, ChevronUp,
  User, UserCheck, FileSpreadsheet,
} from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import CSVImport from "./CSVImport"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"
import IDCard, { StudentCardData, SchoolInfo } from "@/components/dashboard/IDCard"

type Student = {
  id: string
  rollNumber: string | null
  studentId: string | null
  gender: string | null
  admissionDate: string | Date
  dateOfBirth?: string | Date | null
  bloodGroup?: string | null
  nationality?: string | null
  isActive: boolean
  photo?: string | null
  user: { name: string; email: string; phone: string | null; isActive: boolean }
  class: { name: string; section: string | null } | null
}
type Class = { id: string; name: string; section: string | null }
type ParentResult = {
  id: string; relation: string | null
  user: { name: string; email: string; phone: string | null }
  students: { student: { user: { name: string } } }[]
}

interface Props {
  students: Student[]
  classes: Class[]
  schoolId: string
  isParent?: boolean
  school?: SchoolInfo | null
  canAdmit?: boolean
}

const GENDERS      = ["MALE", "FEMALE", "OTHER"]
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const RELATIONS    = ["Father", "Mother", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"]

const emptyStudent = {
  name: "", email: "", phone: "", password: "",
  classId: "", rollNumber: "", studentId: "",
  dateOfBirth: "", gender: "", address: "",
  bloodGroup: "", religion: "", nationality: "Ghanaian",
}
const emptyParent = { name: "", email: "", phone: "", relation: "", occupation: "", address: "" }

function StudentAvatar({ name, photo, size = "sm" }: { name: string; photo?: string | null; size?: "sm" | "lg" }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const cls = size === "lg"
    ? "w-20 h-20 text-2xl font-extrabold rounded-2xl"
    : "w-8 h-8 text-xs font-bold rounded-full"
  if (photo) return <img src={photo} alt={name} className={cn(cls, "object-cover shrink-0 shadow-sm")} />
  return (
    <div className={cn(cls, "bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0")}>
      {initials}
    </div>
  )
}

function SectionHeader({ num, title, icon: Icon, open, onToggle }: {
  num: number; title: string; icon: React.ElementType; open?: boolean; onToggle?: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 border-b border-gray-100 mb-4",
        onToggle && "cursor-pointer select-none"
      )}
      onClick={onToggle}
    >
      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
        {num}
      </div>
      <Icon className="w-4 h-4 text-indigo-500" />
      <h3 className="font-bold text-gray-800 text-sm flex-1">{title}</h3>
      {onToggle && (
        open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />
      )}
    </div>
  )
}

export default function StudentsClient({
  students: initial, classes, schoolId, isParent = false, school, canAdmit = false,
}: Props) {
  const router = useRouter()
  const [students, setStudents]       = useState(initial)
  const [open, setOpen]               = useState(false)
  const [csvOpen, setCsvOpen]         = useState(false)
  const [editing, setEditing]         = useState<Student | null>(null)
  const [idCardStudent, setIdCardStudent] = useState<Student | null>(null)
  const [form, setForm]               = useState(emptyStudent)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState("")
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // Photo
  const [photoPreview, setPhotoPreview] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parent sections
  const [showParent1, setShowParent1] = useState(true)
  const [showParent2, setShowParent2] = useState(false)
  const [parent1, setParent1] = useState({ ...emptyParent, relation: "Father" })
  const [parent2, setParent2] = useState({ ...emptyParent, relation: "Mother" })

  // Parent search (for edit/existing lookup)
  const [parentSearch, setParentSearch]     = useState("")
  const [parentResults, setParentResults]   = useState<ParentResult[]>([])
  const [parentSearching, setParentSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openAdd() {
    setEditing(null); setForm(emptyStudent); setPhotoPreview("")
    setError(""); setParent1({ ...emptyParent, relation: "Father" })
    setParent2({ ...emptyParent, relation: "Mother" })
    setShowParent1(true); setShowParent2(false)
    setParentSearch(""); setParentResults([])
    setOpen(true)
  }

  function openEdit(s: Student) {
    setEditing(s)
    setForm({
      name: s.user.name, email: s.user.email, phone: s.user.phone ?? "",
      password: "",
      classId: s.class ? classes.find(c => c.name === s.class!.name && c.section === s.class!.section)?.id ?? "" : "",
      rollNumber: s.rollNumber ?? "", studentId: s.studentId ?? "",
      dateOfBirth: "", gender: s.gender ?? "", address: "",
      bloodGroup: "", religion: "", nationality: "Ghanaian",
    })
    setPhotoPreview(s.photo ?? ""); setError(""); setOpen(true)
    setShowParent1(false); setShowParent2(false)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError("Photo must be smaller than 2 MB."); return }
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing && !photoPreview) { setError("Passport photo is required."); return }
    setSaving(true); setError("")

    try {
      const payload = { ...form, schoolId, photo: photoPreview || undefined }

      if (editing) {
        const res = await fetch(`/api/students/${editing.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setStudents(prev => prev.map(s => s.id === editing.id ? updated : s))
        setOpen(false)
        return
      }

      // Create student
      const res = await fetch("/api/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const created = await res.json()
      const studentId: string = created.student?.id ?? created.id

      // Link parents if filled
      const parentsToLink = [
        showParent1 && parent1.name.trim() ? parent1 : null,
        showParent2 && parent2.name.trim() ? parent2 : null,
      ].filter(Boolean)

      for (const p of parentsToLink) {
        if (!p) continue
        await fetch(`/api/students/${studentId}/link-parent`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "new", ...p }),
        })
      }

      router.refresh()
      setOpen(false)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(id: string) {
    setConfirmModal({
      message: "Delete this student? This cannot be undone.",
      onConfirm: async () => {
        setDeleting(id)
        try { await fetch(`/api/students/${id}`, { method: "DELETE" }); setStudents(prev => prev.filter(s => s.id !== id)) }
        finally { setDeleting(null) }
      }
    })
  }

  const doParentSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setParentResults([]); return }
    setParentSearching(true)
    try {
      const res = await fetch(`/api/parents/search?q=${encodeURIComponent(q)}&schoolId=${schoolId}`)
      if (res.ok) setParentResults(await res.json())
    } finally { setParentSearching(false) }
  }, [schoolId])

  function onParentSearchChange(val: string) {
    setParentSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doParentSearch(val), 400)
  }

  const columns: Column<Student>[] = [
    {
      key: "user", label: "Student", primary: true,
      render: (s) => (
        <Link href={`/dashboard/students/${s.id}`} className="flex items-center gap-3 group">
          <StudentAvatar name={s.user.name} photo={s.photo} />
          <div>
            <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{s.user.name}</p>
            <p className="text-xs text-gray-400">{s.user.email}</p>
          </div>
        </Link>
      ),
    },
    { key: "class", label: "Class", render: s => s.class ? `${s.class.name}${s.class.section ? ` ${s.class.section}` : ""}` : "—" },
    { key: "rollNumber", label: "Roll No.", render: s => s.rollNumber ?? "—" },
    { key: "gender", label: "Gender", render: s => s.gender ? s.gender.charAt(0) + s.gender.slice(1).toLowerCase() : "—" },
    { key: "admissionDate", label: "Admitted", render: s => formatDate(s.admissionDate) },
    {
      key: "isActive", label: "Status",
      render: s => (
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full",
          s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
          <span className={cn("w-1.5 h-1.5 rounded-full", s.isActive ? "bg-emerald-500" : "bg-red-400")} />
          {s.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${students.length} student${students.length !== 1 ? "s" : ""} enrolled`}
        action={canAdmit ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCsvOpen(true)}
              className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> Import CSV
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Admit Student
            </button>
          </div>
        ) : undefined}
      />

      {students.length === 0 && !open ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-base font-bold text-gray-800 mb-1">No students yet</h2>
          <p className="text-sm text-gray-500 mb-4">
            {isParent ? "No wards linked to your account yet." : "Add your first student to get started."}
          </p>
          {canAdmit && (
            <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline">
              + Admit Student
            </button>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns} data={students} keyField="id" viewKey="students"
          photoUrl={s => s.photo}
          initials={s => s.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
          searchPlaceholder="Search by name or email…" searchKeys={["user"] as any}
          emptyMessage="No students match your search."
          actions={(s) => (
            <div className="flex items-center gap-1 justify-end">
              <Link href={`/dashboard/students/${s.id}`}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Profile">
                <Eye className="w-3.5 h-3.5" />
              </Link>
              <button onClick={() => setIdCardStudent(s)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="ID Card">
                <CreditCard className="w-3.5 h-3.5" />
              </button>
              {!isParent && (
                <>
                  <button onClick={() => openEdit(s)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        />
      )}

      {/* ── Admission / Edit Modal ─────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[96vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editing ? "Edit Student" : "Student Admission Form"}
                </h2>
                {!editing && <p className="text-xs text-gray-400 mt-0.5">Fill in student details and guardian information below</p>}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
              )}

              {/* ── SECTION 1: Student Information ───────────────────── */}
              <div>
                <SectionHeader num={1} title="Student Information" icon={User} />

                {/* Photo */}
                <div className="flex flex-col items-center gap-3 mb-5">
                  <div className="relative">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Photo" className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 shadow" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-400">
                        <Camera className="w-8 h-8 mb-0.5" />
                        <span className="text-[10px] font-semibold">Photo</span>
                      </div>
                    )}
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow hover:bg-indigo-700">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      Passport Photo {!editing && <span className="text-red-500">*</span>}
                    </p>
                    <p className="text-xs text-gray-400">Max 2 MB · JPG or PNG · Passport size</p>
                  </div>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-semibold text-indigo-600 border border-indigo-200 px-4 py-1.5 rounded-xl hover:bg-indigo-50">
                    {photoPreview ? "Change Photo" : "Upload Photo"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Full Name *</label>
                    <input className="input" required value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. David Duuti" />
                  </div>
                  <div>
                    <label className="label">Class</label>
                    <select className="input" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                      <option value="">— Select Class —</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Student ID</label>
                    <input className="input" value={form.studentId}
                      onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="CFA-2025-001" />
                  </div>
                  <div>
                    <label className="label">Roll Number</label>
                    <input className="input" value={form.rollNumber}
                      onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} placeholder="001" />
                  </div>
                  <div>
                    <label className="label">Email <span className="text-gray-400 font-normal text-[11px]">(optional)</span></label>
                    <input className="input" type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="student@email.com" />
                  </div>
                  <div>
                    <label className="label">Phone <span className="text-gray-400 font-normal text-[11px]">(optional)</span></label>
                    <input className="input" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0241234567" />
                  </div>
                  {!editing && (
                    <div>
                      <label className="label">Password <span className="text-gray-400 font-normal text-[11px]">(default: changeme123)</span></label>
                      <input className="input" type="password" value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank for default" />
                    </div>
                  )}
                </div>
              </div>

              {/* ── SECTION 2: Other Information ─────────────────────── */}
              <div>
                <SectionHeader num={2} title="Other Information" icon={UserCheck} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date of Birth</label>
                    <input className="input" type="date" value={form.dateOfBirth}
                      onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">— Select —</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Blood Group</label>
                    <select className="input" value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                      <option value="">— Select —</option>
                      {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Religion</label>
                    <input className="input" value={form.religion}
                      onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} placeholder="Christianity" />
                  </div>
                  <div>
                    <label className="label">Nationality</label>
                    <input className="input" value={form.nationality}
                      onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Address</label>
                    <input className="input" value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="P.O. Box 12, Tamale" />
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: Father / Guardian Information ─────────── */}
              {!editing && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <SectionHeader num={3} title="Father / Guardian Information"
                    icon={Users} open={showParent1} onToggle={() => setShowParent1(v => !v)} />

                  {showParent1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                      <div className="sm:col-span-2">
                        <label className="label">Full Name</label>
                        <input className="input bg-white" value={parent1.name}
                          onChange={e => setParent1(p => ({ ...p, name: e.target.value }))} placeholder="Mr. Daniel Duuti" />
                      </div>
                      <div>
                        <label className="label">Phone</label>
                        <input className="input bg-white" value={parent1.phone}
                          onChange={e => setParent1(p => ({ ...p, phone: e.target.value }))} placeholder="0241234567" />
                      </div>
                      <div>
                        <label className="label">Relation to Student</label>
                        <select className="input bg-white" value={parent1.relation}
                          onChange={e => setParent1(p => ({ ...p, relation: e.target.value }))}>
                          {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Email <span className="text-gray-400 font-normal text-[11px]">(optional)</span></label>
                        <input className="input bg-white" type="email" value={parent1.email}
                          onChange={e => setParent1(p => ({ ...p, email: e.target.value }))} placeholder="parent@email.com" />
                      </div>
                      <div>
                        <label className="label">Occupation</label>
                        <input className="input bg-white" value={parent1.occupation}
                          onChange={e => setParent1(p => ({ ...p, occupation: e.target.value }))} placeholder="Farmer, Teacher…" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">Address <span className="text-gray-400 font-normal text-[11px]">(optional)</span></label>
                        <input className="input bg-white" value={parent1.address}
                          onChange={e => setParent1(p => ({ ...p, address: e.target.value }))} placeholder="P.O. Box 12, Tamale" />
                      </div>
                    </div>
                  )}

                  {!showParent1 && (
                    <p className="text-xs text-gray-400 italic mt-1">Click to expand and add father/guardian details</p>
                  )}
                </div>
              )}

              {/* ── SECTION 4: Mother / Second Guardian ──────────────── */}
              {!editing && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <SectionHeader num={4} title="Mother / Second Guardian Information"
                    icon={Users} open={showParent2} onToggle={() => setShowParent2(v => !v)} />

                  {showParent2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                      <div className="sm:col-span-2">
                        <label className="label">Full Name</label>
                        <input className="input bg-white" value={parent2.name}
                          onChange={e => setParent2(p => ({ ...p, name: e.target.value }))} placeholder="Mrs. Mary Duut" />
                      </div>
                      <div>
                        <label className="label">Phone</label>
                        <input className="input bg-white" value={parent2.phone}
                          onChange={e => setParent2(p => ({ ...p, phone: e.target.value }))} placeholder="0241234567" />
                      </div>
                      <div>
                        <label className="label">Relation to Student</label>
                        <select className="input bg-white" value={parent2.relation}
                          onChange={e => setParent2(p => ({ ...p, relation: e.target.value }))}>
                          {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Email <span className="text-gray-400 font-normal text-[11px]">(optional)</span></label>
                        <input className="input bg-white" type="email" value={parent2.email}
                          onChange={e => setParent2(p => ({ ...p, email: e.target.value }))} placeholder="parent@email.com" />
                      </div>
                      <div>
                        <label className="label">Occupation</label>
                        <input className="input bg-white" value={parent2.occupation}
                          onChange={e => setParent2(p => ({ ...p, occupation: e.target.value }))} placeholder="Trader, Nurse…" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">Address <span className="text-gray-400 font-normal text-[11px]">(optional)</span></label>
                        <input className="input bg-white" value={parent2.address}
                          onChange={e => setParent2(p => ({ ...p, address: e.target.value }))} placeholder="P.O. Box 12, Tamale" />
                      </div>
                    </div>
                  )}

                  {!showParent2 && (
                    <p className="text-xs text-gray-400 italic mt-1">Click to expand and add mother/second guardian details</p>
                  )}
                </div>
              )}

              {/* ── Search existing parent (edit mode) ───────────────── */}
              {editing && (
                <div>
                  <SectionHeader num={3} title="Link Existing Parent" icon={Users} />
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={parentSearch} onChange={e => onParentSearchChange(e.target.value)}
                      placeholder="Search by name or email…" className="input pl-9"
                    />
                  </div>
                  {parentSearching && <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>}
                  {parentResults.length > 0 && (
                    <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                      {parentResults.map(p => (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {p.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{p.user.name}</p>
                            <p className="text-xs text-gray-400">{p.user.email}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ── Submit buttons ────────────────────────────────────── */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : editing ? "Update Student" : "Admit Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; background: white; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>

      <ConfirmModal
        open={!!confirmModal} message={confirmModal?.message ?? ""}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null) }}
        onCancel={() => setConfirmModal(null)}
      />

      {csvOpen && (
        <CSVImport
          classes={classes}
          onClose={() => setCsvOpen(false)}
          onDone={() => { setCsvOpen(false); router.refresh() }}
        />
      )}

      {idCardStudent && school && (
        <IDCard
          data={{
            type: "student", name: idCardStudent.user.name, photo: idCardStudent.photo,
            className: idCardStudent.class
              ? `${idCardStudent.class.name}${idCardStudent.class.section ? ` – ${idCardStudent.class.section}` : ""}` : null,
            studentId: idCardStudent.studentId, rollNumber: idCardStudent.rollNumber,
            dateOfBirth: idCardStudent.dateOfBirth, gender: idCardStudent.gender,
            admissionDate: idCardStudent.admissionDate, bloodGroup: idCardStudent.bloodGroup,
            nationality: idCardStudent.nationality,
          } satisfies StudentCardData}
          school={school}
          onClose={() => setIdCardStudent(null)}
        />
      )}
    </div>
  )
}
