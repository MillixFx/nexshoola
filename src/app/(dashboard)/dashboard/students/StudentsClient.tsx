"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Pencil, Trash2, Users, Eye, Camera, Search, Loader2, X, CreditCard } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
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
  id: string
  relation: string | null
  user: { name: string; email: string; phone: string | null }
  students: { student: { user: { name: string } } }[]
}

interface Props {
  students: Student[]
  classes: Class[]
  schoolId: string
  isParent?: boolean
  school?: SchoolInfo | null
}

const GENDERS = ["MALE", "FEMALE", "OTHER"]
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

const emptyForm = {
  name: "", email: "", phone: "", password: "",
  classId: "", rollNumber: "", studentId: "",
  dateOfBirth: "", gender: "", address: "",
  bloodGroup: "", religion: "", nationality: "Ghanaian",
}

const emptyLinkForm = {
  name: "", email: "", phone: "", relation: "Parent", occupation: "", address: "",
}

/** Circular avatar — shows photo or initials fallback */
function StudentAvatar({ name, photo, size = "sm" }: { name: string; photo?: string | null; size?: "sm" | "lg" }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const cls = size === "lg"
    ? "w-20 h-20 text-2xl font-extrabold rounded-2xl"
    : "w-8 h-8 text-xs font-bold rounded-full"

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={cn(cls, "object-cover shrink-0 shadow-sm")}
      />
    )
  }
  return (
    <div className={cn(cls, "bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0")}>
      {initials}
    </div>
  )
}

export default function StudentsClient({ students: initial, classes, schoolId, isParent = false, school }: Props) {
  const router = useRouter()
  const [students, setStudents] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [idCardStudent, setIdCardStudent] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // Photo state (separate because File objects can't go in plain state)
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Link-parent step state ──────────────────────────────
  const [linkStep, setLinkStep] = useState(false)
  const [newStudentId, setNewStudentId] = useState<string | null>(null)
  const [newStudentHasPhone, setNewStudentHasPhone] = useState(false)
  const [linkTab, setLinkTab] = useState<"search" | "new">("search")
  const [parentSearch, setParentSearch] = useState("")
  const [parentResults, setParentResults] = useState<ParentResult[]>([])
  const [parentSearching, setParentSearching] = useState(false)
  const [linkForm, setLinkForm] = useState(emptyLinkForm)
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState("")
  const [skipGuardianPhone, setSkipGuardianPhone] = useState("")
  const [skipGuardianError, setSkipGuardianError] = useState("")
  const [savingGuardian, setSavingGuardian] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setPhotoPreview("")
    setError("")
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
    setPhotoPreview(s.photo ?? "")
    setError("")
    setOpen(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be smaller than 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing && !photoPreview) {
      setError("Passport photo is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = { ...form, schoolId, photo: photoPreview || undefined }

      if (editing) {
        const res = await fetch(`/api/students/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setStudents(prev => prev.map(s => s.id === editing.id ? updated : s))
        setOpen(false)
      } else {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const created = await res.json()
        const createdStudentId: string = created.student?.id ?? created.id
        router.refresh()
        setOpen(false)
        // Open link-parent step
        setNewStudentId(createdStudentId)
        setNewStudentHasPhone(!!form.phone.trim())
        setLinkStep(true)
        setLinkTab("search")
        setParentSearch("")
        setParentResults([])
        setLinkForm(emptyLinkForm)
        setLinkError("")
        setSkipGuardianPhone("")
        setSkipGuardianError("")
      }
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
        try {
          await fetch(`/api/students/${id}`, { method: "DELETE" })
          setStudents(prev => prev.filter(s => s.id !== id))
        } finally {
          setDeleting(null)
        }
      }
    })
  }

  // ── Parent search (debounced) ─────────────────────────
  const doParentSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setParentResults([]); return }
    setParentSearching(true)
    try {
      const res = await fetch(`/api/parents/search?q=${encodeURIComponent(q)}&schoolId=${schoolId}`)
      if (res.ok) setParentResults(await res.json())
    } finally {
      setParentSearching(false)
    }
  }, [schoolId])

  function onParentSearchChange(val: string) {
    setParentSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doParentSearch(val), 400)
  }

  async function linkExistingParent(parentId: string) {
    if (!newStudentId) return
    setLinking(true)
    setLinkError("")
    try {
      const res = await fetch(`/api/students/${newStudentId}/link-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "existing", parentId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
      setLinkStep(false)
    } catch (err: any) {
      setLinkError(err.message || "Failed to link parent")
    } finally {
      setLinking(false)
    }
  }

  async function handleSkip() {
    if (!newStudentHasPhone) {
      if (!skipGuardianPhone.trim()) {
        setSkipGuardianError("A guardian contact number is required when no parent is linked.")
        return
      }
      // Save guardian phone to student's user record
      setSavingGuardian(true)
      try {
        await fetch(`/api/students/${newStudentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: skipGuardianPhone.trim() }),
        })
        router.refresh()
      } finally {
        setSavingGuardian(false)
      }
    }
    setLinkStep(false)
  }

  async function linkNewParent(e: React.FormEvent) {
    e.preventDefault()
    if (!newStudentId) return
    setLinking(true)
    setLinkError("")
    try {
      const res = await fetch(`/api/students/${newStudentId}/link-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "new", ...linkForm }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
      setLinkStep(false)
    } catch (err: any) {
      setLinkError(err.message || "Failed to create and link parent")
    } finally {
      setLinking(false)
    }
  }

  const columns: Column<Student>[] = [
    {
      key: "user",
      label: "Student",
      render: (s) => (
        <Link href={`/dashboard/students/${s.id}`} className="flex items-center gap-3 group">
          <StudentAvatar name={s.user.name} photo={s.photo} size="sm" />
          <div>
            <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{s.user.name}</p>
            <p className="text-xs text-gray-400">{s.user.email}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "class",
      label: "Class",
      render: (s) => s.class ? `${s.class.name}${s.class.section ? ` ${s.class.section}` : ""}` : "—",
    },
    { key: "rollNumber", label: "Roll No.", render: s => s.rollNumber ?? "—" },
    { key: "gender", label: "Gender", render: s => s.gender ? s.gender.charAt(0) + s.gender.slice(1).toLowerCase() : "—" },
    {
      key: "admissionDate",
      label: "Admitted",
      render: s => formatDate(s.admissionDate),
    },
    {
      key: "isActive",
      label: "Status",
      render: s => (
        <span className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full",
          s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
        )}>
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
        action={
          !isParent ? (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          ) : undefined
        }
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
          {!isParent && (
            <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline">
              + Add Student
            </button>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={students}
          keyField="id"
          searchPlaceholder="Search by name or email…"
          searchKeys={["user"] as any}
          emptyMessage="No students match your search."
          actions={(s) => (
            <div className="flex items-center gap-1 justify-end">
              <Link
                href={`/dashboard/students/${s.id}`}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="View Profile"
              >
                <Eye className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setIdCardStudent(s)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="ID Card"
              >
                <CreditCard className="w-3.5 h-3.5" />
              </button>
              {!isParent && (
                <>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        />
      )}

      {/* ── Add/Edit Student Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? "Edit Student" : "Add New Student"}
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
              )}

              {/* ── Passport Photo ─────────────────────────────────── */}
              <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
                <div className="relative">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Passport photo preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 shadow"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-400">
                      <Camera className="w-8 h-8 mb-0.5" />
                      <span className="text-[10px] font-semibold">Photo</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow hover:bg-indigo-700 transition-colors"
                    title="Upload photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-800">
                    Passport Photo {!editing && <span className="text-red-500">*</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Max 2 MB · JPG or PNG · Passport size</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-semibold text-indigo-600 border border-indigo-200 px-4 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  {photoPreview ? "Change Photo" : "Upload Photo"}
                </button>
              </div>

              {/* ── Form fields ────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Full Name *</label>
                  <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Kwame Asante" />
                </div>
                <div>
                  <label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="student@email.com" />
                </div>
                <div>
                  <label className="label">Phone <span className="text-gray-400 font-normal">(optional if parent linked)</span></label>
                  <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0241234567" />
                </div>
                {!editing && (
                  <div className="sm:col-span-2">
                    <label className="label">Password <span className="text-gray-400 font-normal">(default: changeme123)</span></label>
                    <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank for default" />
                  </div>
                )}
                <div>
                  <label className="label">Class</label>
                  <select className="input" value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                    <option value="">— Select class —</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Roll Number</label>
                  <input className="input" value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} placeholder="001" />
                </div>
                <div>
                  <label className="label">Student ID</label>
                  <input className="input" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} placeholder="STU-2024-001" />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input className="input" type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
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
                <div className="sm:col-span-2">
                  <label className="label">Address</label>
                  <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="P.O. Box 12, Accra" />
                </div>
                <div>
                  <label className="label">Religion</label>
                  <input className="input" value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} placeholder="Christianity" />
                </div>
                <div>
                  <label className="label">Nationality</label>
                  <input className="input" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Update Student" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Link Parent Modal */}
      {linkStep && newStudentId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Link a Parent</h2>
                <p className="text-xs text-gray-500 mt-0.5">Student created successfully. Link a parent now or skip.</p>
              </div>
              <button onClick={() => setLinkStep(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setLinkTab("search")}
                className={cn(
                  "flex-1 py-3 text-sm font-semibold transition-colors",
                  linkTab === "search" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Search Existing
              </button>
              <button
                onClick={() => setLinkTab("new")}
                className={cn(
                  "flex-1 py-3 text-sm font-semibold transition-colors",
                  linkTab === "new" ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Add New Parent
              </button>
            </div>

            <div className="p-6">
              {linkError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{linkError}</div>
              )}

              {linkTab === "search" ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      autoFocus
                      value={parentSearch}
                      onChange={e => onParentSearchChange(e.target.value)}
                      placeholder="Search by name or email…"
                      className="input pl-9"
                    />
                  </div>
                  {parentSearching && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                  )}
                  {!parentSearching && parentResults.length > 0 && (
                    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                      {parentResults.map(p => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => linkExistingParent(p.id)}
                            disabled={linking}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left disabled:opacity-60"
                          >
                            <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {p.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">{p.user.name}</p>
                              <p className="text-xs text-gray-400 truncate">{p.user.email}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-gray-500">{p.relation ?? "Parent"}</p>
                              <p className="text-xs text-gray-400">{p.students.length} child{p.students.length !== 1 ? "ren" : ""}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!parentSearching && parentSearch.trim() && parentResults.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No parents found for &ldquo;{parentSearch}&rdquo;</p>
                  )}

                  {/* Guardian phone — required when skipping with no parent phone on file */}
                  {!newStudentHasPhone && (
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        No phone number on record. A guardian contact is required to skip parent linking.
                      </p>
                      <label className="label">Guardian Contact Number *</label>
                      <input
                        className="input"
                        value={skipGuardianPhone}
                        onChange={e => { setSkipGuardianPhone(e.target.value); setSkipGuardianError("") }}
                        placeholder="0241234567"
                      />
                      {skipGuardianError && <p className="text-xs text-red-600">{skipGuardianError}</p>}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={savingGuardian}
                    className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {savingGuardian ? "Saving…" : "Skip for now"}
                  </button>
                </div>
              ) : (
                <form onSubmit={linkNewParent} className="space-y-4">
                  <div>
                    <label className="label">Full Name *</label>
                    <input className="input" required value={linkForm.name} onChange={e => setLinkForm(f => ({ ...f, name: e.target.value }))} placeholder="Mrs. Adwoa Mensah" />
                  </div>
                  <div>
                    <label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input className="input" type="email" value={linkForm.email} onChange={e => setLinkForm(f => ({ ...f, email: e.target.value }))} placeholder="parent@email.com" />
                  </div>
                  <div>
                    <label className="label">Phone *</label>
                    <input className="input" required value={linkForm.phone} onChange={e => setLinkForm(f => ({ ...f, phone: e.target.value }))} placeholder="0241234567" />
                  </div>
                  <div>
                    <label className="label">Relation to Student</label>
                    <input className="input" value={linkForm.relation} onChange={e => setLinkForm(f => ({ ...f, relation: e.target.value }))} placeholder="Mother, Father, Guardian…" />
                  </div>
                  <div>
                    <label className="label">Occupation</label>
                    <input className="input" value={linkForm.occupation} onChange={e => setLinkForm(f => ({ ...f, occupation: e.target.value }))} placeholder="Teacher, Trader…" />
                  </div>
                  <div>
                    <label className="label">Address</label>
                    <input className="input" value={linkForm.address} onChange={e => setLinkForm(f => ({ ...f, address: e.target.value }))} placeholder="P.O. Box 12, Accra" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={savingGuardian}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {savingGuardian ? "Saving…" : "Skip for now"}
                    </button>
                    <button
                      type="submit"
                      disabled={linking}
                      className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {linking ? "Linking…" : "Create & Link"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; background: white; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>
      <ConfirmModal
        open={!!confirmModal}
        message={confirmModal?.message ?? ""}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null) }}
        onCancel={() => setConfirmModal(null)}
      />

      {idCardStudent && school && (
        <IDCard
          data={{
            type: "student",
            name: idCardStudent.user.name,
            photo: idCardStudent.photo,
            className: idCardStudent.class
              ? `${idCardStudent.class.name}${idCardStudent.class.section ? ` – ${idCardStudent.class.section}` : ""}`
              : null,
            studentId: idCardStudent.studentId,
            rollNumber: idCardStudent.rollNumber,
            dateOfBirth: idCardStudent.dateOfBirth,
            gender: idCardStudent.gender,
            admissionDate: idCardStudent.admissionDate,
            bloodGroup: idCardStudent.bloodGroup,
            nationality: idCardStudent.nationality,
          } satisfies StudentCardData}
          school={school}
          onClose={() => setIdCardStudent(null)}
        />
      )}
    </div>
  )
}
