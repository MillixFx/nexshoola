"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Pencil, Trash2, Users, Eye, Camera } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

type Student = {
  id: string
  rollNumber: string | null
  studentId: string | null
  gender: string | null
  admissionDate: string | Date
  isActive: boolean
  photo?: string | null
  user: { name: string; email: string; phone: string | null; isActive: boolean }
  class: { name: string; section: string | null } | null
}

type Class = { id: string; name: string; section: string | null }

interface Props {
  students: Student[]
  classes: Class[]
  schoolId: string
}

const GENDERS = ["MALE", "FEMALE", "OTHER"]
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

const emptyForm = {
  name: "", email: "", phone: "", password: "",
  classId: "", rollNumber: "", studentId: "",
  dateOfBirth: "", gender: "", address: "",
  bloodGroup: "", religion: "", nationality: "Ghanaian",
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

export default function StudentsClient({ students: initial, classes, schoolId }: Props) {
  const router = useRouter()
  const [students, setStudents] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)

  // Photo state (separate because File objects can't go in plain state)
  const [photoPreview, setPhotoPreview] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      } else {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        router.refresh()
        setOpen(false)
        return
      }
      setOpen(false)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this student? This cannot be undone.")) return
    setDeleting(id)
    try {
      await fetch(`/api/students/${id}`, { method: "DELETE" })
      setStudents(prev => prev.filter(s => s.id !== id))
    } finally {
      setDeleting(null)
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
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        }
      />

      {students.length === 0 && !open ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-base font-bold text-gray-800 mb-1">No students yet</h2>
          <p className="text-sm text-gray-500 mb-4">Add your first student to get started.</p>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline">
            + Add Student
          </button>
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
            </div>
          )}
        />
      )}

      {/* Modal */}
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
                  <label className="label">Email *</label>
                  <input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="student@email.com" />
                </div>
                <div>
                  <label className="label">Phone</label>
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

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; background: white; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>
    </div>
  )
}
