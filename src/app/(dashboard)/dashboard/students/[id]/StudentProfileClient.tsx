"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Printer, User, Mail, Phone, MapPin, BookOpen,
  Calendar, Droplets, Globe, Church, Hash, GraduationCap,
  CheckCircle2, XCircle, Clock, TrendingUp, CreditCard,
  AlertCircle, FileText, Plus, Search, Loader2, UserPlus,
  Users, X,
} from "lucide-react"
import { formatDate, formatCurrency, cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type AttendanceRecord = { date: string; status: string; note: string | null }
type Mark = {
  id: string; examId: string; examTitle: string; examTerm: string | null
  subject: string; subjectCode: string | null; marks: number; grade: string | null
}
type Fee = {
  id: string; title: string; term: string | null; academicYear: string | null
  amount: number; paidAmount: number; status: string
  dueDate: string | null; paidAt: string | null; paystackRef: string | null
}
type Parent = {
  relation: string | null
  parent: {
    id: string
    occupation: string | null
    phone: string | null
    user: { name: string; email: string; phone: string | null }
  }
}
type ParentResult = {
  id: string
  relation: string | null
  occupation: string | null
  phone: string | null
  user: { name: string; email: string; phone: string | null }
}
type Student = {
  id: string; rollNumber: string | null; studentId: string | null; gender: string | null
  dateOfBirth: string | null; address: string | null; bloodGroup: string | null
  religion: string | null; nationality: string | null; admissionDate: string; isActive: boolean
  photo?: string | null
  user: { name: string; email: string; phone: string | null; isActive: boolean; avatar: string | null }
  class: { id: string; name: string; section: string | null } | null
  parents: Parent[]; attendance: AttendanceRecord[]; marks: Mark[]; fees: Fee[]
}
type Stats = {
  totalDays: number; present: number; absent: number; late: number
  attendanceRate: number; totalFees: number; paidFees: number
}

const TABS = ["Profile", "Attendance", "Results", "Fees"] as const

const RELATIONS = ["Father", "Mother", "Guardian", "Uncle", "Aunt", "Grandparent", "Other"]

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700",
  ABSENT: "bg-red-50 text-red-600",
  LATE: "bg-amber-50 text-amber-700",
  EXCUSED: "bg-blue-50 text-blue-700",
}
const STATUS_ICON: Record<string, React.ElementType> = {
  PRESENT: CheckCircle2, ABSENT: XCircle, LATE: Clock, EXCUSED: AlertCircle,
}

function gradeColor(marks: number) {
  if (marks >= 80) return "text-emerald-600 bg-emerald-50"
  if (marks >= 60) return "text-blue-600 bg-blue-50"
  if (marks >= 50) return "text-amber-600 bg-amber-50"
  return "text-red-600 bg-red-50"
}

const emptyNewParent = { name: "", phone: "", email: "", relation: "Father", occupation: "" }

export default function StudentProfileClient({
  student: studentProp, stats, school, isAdmin,
}: {
  student: Student
  stats: Stats
  school: { name: string; address: string | null; currency: string }
  isAdmin: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<typeof TABS[number]>("Profile")

  // Local parents state so UI updates immediately after operations
  const [parents, setParents] = useState<Parent[]>(studentProp.parents)

  // Parent management modal state
  const [parentModal, setParentModal] = useState(false)
  const [parentModalTab, setParentModalTab] = useState<"search" | "new">("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ParentResult[]>([])
  const [searching, setSearching] = useState(false)
  const [linkRelation, setLinkRelation] = useState("Father")
  const [newP, setNewP] = useState(emptyNewParent)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Unlink guardian confirmation
  const [toUnlink, setToUnlink] = useState<{ parentId: string; name: string } | null>(null)
  const [unlinking, setUnlinking] = useState(false)
  const [unlinkError, setUnlinkError] = useState<string | null>(null)

  const initials = studentProp.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  // Group marks by exam
  const examGroups = studentProp.marks.reduce<Record<string, Mark[]>>((acc, m) => {
    if (!acc[m.examId]) acc[m.examId] = []
    acc[m.examId].push(m)
    return acc
  }, {})

  // ── Parent modal helpers ─────────────────────────────────

  function closeParentModal() {
    setParentModal(false)
    setSearchQuery("")
    setSearchResults([])
    setNewP(emptyNewParent)
    setModalError(null)
    setLinkRelation("Father")
    setParentModalTab("search")
  }

  async function searchParents() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setModalError(null)
    try {
      const res = await fetch(`/api/parents/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Search failed")
      setSearchResults(data)
    } catch (e: any) {
      setModalError(e.message)
    } finally {
      setSearching(false)
    }
  }

  async function linkExisting(parentResult: ParentResult) {
    setSaving(true)
    setModalError(null)
    try {
      const res = await fetch(`/api/students/${studentProp.id}/link-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "existing", parentId: parentResult.id, relation: linkRelation }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to link")

      // Optimistically add to local state
      setParents(prev => [
        ...prev.filter(p => p.parent.id !== parentResult.id),
        {
          relation: linkRelation,
          parent: {
            id: parentResult.id,
            occupation: parentResult.occupation,
            phone: parentResult.phone,
            user: parentResult.user,
          },
        },
      ])
      closeParentModal()
    } catch (e: any) {
      setModalError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function doUnlinkParent() {
    if (!toUnlink) return
    setUnlinking(true)
    setUnlinkError(null)
    try {
      const res = await fetch(`/api/students/${studentProp.id}/link-parent`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: toUnlink.parentId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setUnlinkError(data.error ?? "Failed to unlink guardian")
        setToUnlink(null)
        return
      }
      setParents(prev => prev.filter(p => p.parent.id !== toUnlink.parentId))
      setToUnlink(null)
    } catch {
      setUnlinkError("Failed to unlink guardian")
      setToUnlink(null)
    } finally {
      setUnlinking(false)
    }
  }

  async function handleAddNew() {
    if (!newP.name.trim()) { setModalError("Name is required."); return }
    if (!newP.phone.trim()) { setModalError("Phone number is required."); return }
    setSaving(true)
    setModalError(null)
    try {
      const res = await fetch(`/api/students/${studentProp.id}/link-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new",
          name: newP.name.trim(),
          phone: newP.phone.trim(),
          email: newP.email.trim() || undefined,
          relation: newP.relation,
          occupation: newP.occupation.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to add guardian")

      // Refresh page to get full parent data (including generated email etc.)
      closeParentModal()
      router.refresh()
    } catch (e: any) {
      setModalError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/dashboard/students" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/students/${studentProp.id}/report-card`}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50"
          >
            <FileText className="w-4 h-4" /> Report Card
          </Link>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-semibold text-gray-600 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print Profile
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">{school.name}</h1>
        {school.address && <p className="text-sm text-gray-500">{school.address}</p>}
        <hr className="my-3" />
        <p className="text-xs text-gray-400">Student Profile — Printed {new Date().toLocaleDateString()}</p>
      </div>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {studentProp.photo ? (
            <img
              src={studentProp.photo}
              alt={studentProp.user.name}
              className="w-20 h-20 rounded-2xl object-cover shrink-0 shadow border-2 border-indigo-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white text-2xl font-extrabold flex items-center justify-center shrink-0 shadow-sm">
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-gray-900">{studentProp.user.name}</h1>
              <span className={cn(
                "text-xs font-bold px-2.5 py-0.5 rounded-full",
                studentProp.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              )}>
                {studentProp.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              {studentProp.class && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {studentProp.class.name}{studentProp.class.section ? ` ${studentProp.class.section}` : ""}
                </span>
              )}
              {studentProp.studentId && (
                <span className="flex items-center gap-1.5 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded-lg">
                  <Hash className="w-3 h-3" />{studentProp.studentId}
                </span>
              )}
              {studentProp.rollNumber && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">Roll #{studentProp.rollNumber}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{studentProp.user.email}</span>
              {studentProp.user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{studentProp.user.phone}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Admitted {formatDate(studentProp.admissionDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Attendance", value: `${stats.attendanceRate}%`,
            sub: `${stats.present}/${stats.totalDays} days`,
            color: stats.attendanceRate >= 80 ? "text-emerald-600" : stats.attendanceRate >= 60 ? "text-amber-600" : "text-red-600",
            icon: CheckCircle2,
          },
          {
            label: "Absent Days", value: String(stats.absent),
            sub: `${stats.late} late`,
            color: stats.absent > 10 ? "text-red-600" : "text-gray-800",
            icon: XCircle,
          },
          {
            label: "Exams Taken", value: String(Object.keys(examGroups).length),
            sub: `${studentProp.marks.length} subject marks`,
            color: "text-indigo-600",
            icon: BookOpen,
          },
          {
            label: "Fees Paid", value: formatCurrency(stats.paidFees),
            sub: `of ${formatCurrency(stats.totalFees)}`,
            color: stats.paidFees >= stats.totalFees && stats.totalFees > 0 ? "text-emerald-600" : "text-amber-600",
            icon: CreditCard,
          },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <s.icon className={cn("w-5 h-5 shrink-0", s.color)} />
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={cn("text-lg font-extrabold", s.color)}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit print:hidden">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-all",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Profile tab ─────────────────────────────────────── */}
      {tab === "Profile" && (
        <div className="space-y-4">
          {/* Personal info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: User, label: "Full Name", value: studentProp.user.name },
                { icon: Mail, label: "Email", value: studentProp.user.email },
                { icon: Phone, label: "Phone", value: studentProp.user.phone },
                { icon: Calendar, label: "Date of Birth", value: studentProp.dateOfBirth ? formatDate(studentProp.dateOfBirth) : null },
                { icon: User, label: "Gender", value: studentProp.gender ? studentProp.gender.charAt(0) + studentProp.gender.slice(1).toLowerCase() : null },
                { icon: Droplets, label: "Blood Group", value: studentProp.bloodGroup },
                { icon: Globe, label: "Nationality", value: studentProp.nationality },
                { icon: Church, label: "Religion", value: studentProp.religion },
                { icon: MapPin, label: "Address", value: studentProp.address },
                { icon: Calendar, label: "Admission Date", value: formatDate(studentProp.admissionDate) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className="text-sm font-medium text-gray-800">{value ?? <span className="text-gray-300 italic">—</span>}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parents / Guardians */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Parents / Guardians</h2>
              {isAdmin && (
                <button
                  onClick={() => { setParentModal(true); setParentModalTab("search") }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Guardian
                </button>
              )}
            </div>

            {unlinkError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 flex-1">{unlinkError}</p>
                <button onClick={() => setUnlinkError(null)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {parents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No guardians linked yet.</p>
                {isAdmin && (
                  <button
                    onClick={() => { setParentModal(true); setParentModalTab("new") }}
                    className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + Add a guardian
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {parents.map((sp, i) => (
                  <div key={sp.parent.id ?? i} className="relative flex items-start gap-3 p-3 bg-gray-50 rounded-xl group">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center shrink-0">
                      {sp.parent.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900">{sp.parent.user.name}</p>
                      <p className="text-xs text-indigo-600 font-medium">{sp.relation ?? "Guardian"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sp.parent.user.email}</p>
                      {(sp.parent.phone || sp.parent.user.phone) && (
                        <p className="text-xs text-gray-400">{sp.parent.phone ?? sp.parent.user.phone}</p>
                      )}
                      {sp.parent.occupation && <p className="text-xs text-gray-400">{sp.parent.occupation}</p>}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setToUnlink({ parentId: sp.parent.id, name: sp.parent.user.name })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-all"
                        title="Remove guardian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Attendance tab ───────────────────────────────────── */}
      {tab === "Attendance" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Attendance Summary (Last 90 Days)</h2>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "Present", value: stats.present, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                { label: "Absent", value: stats.absent, color: "bg-red-50 text-red-600 border-red-200" },
                { label: "Late", value: stats.late, color: "bg-amber-50 text-amber-700 border-amber-200" },
                { label: "Rate", value: `${stats.attendanceRate}%`, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
              ].map(s => (
                <div key={s.label} className={cn("border rounded-xl p-3 text-center", s.color)}>
                  <p className="text-xl font-extrabold">{s.value}</p>
                  <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.attendanceRate}%` }} />
              </div>
              <span className="text-sm font-bold text-gray-600 w-12 text-right">{stats.attendanceRate}%</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Note</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {studentProp.attendance.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">No attendance records.</td></tr>
                ) : studentProp.attendance.map((a, i) => {
                  const Icon = STATUS_ICON[a.status] ?? CheckCircle2
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-700">{formatDate(a.date)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full", STATUS_COLOR[a.status] ?? "bg-gray-50 text-gray-600")}>
                          <Icon className="w-3 h-3" />{a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{a.note ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Results tab ─────────────────────────────────────── */}
      {tab === "Results" && (
        <div className="space-y-4">
          {Object.keys(examGroups).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No exam results recorded yet.</p>
            </div>
          ) : Object.entries(examGroups).map(([examId, marks]) => {
            const avg = marks.reduce((s, m) => s + m.marks, 0) / marks.length
            const examInfo = marks[0]
            return (
              <div key={examId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">{examInfo.examTitle}</p>
                    {examInfo.examTerm && <p className="text-xs text-gray-400">{examInfo.examTerm}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Average</p>
                    <p className={cn("text-lg font-extrabold px-2 py-0.5 rounded-lg", gradeColor(avg))}>
                      {avg.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Subject</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Score</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Grade</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {marks.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          {m.subject}
                          {m.subjectCode && <span className="ml-1.5 text-xs text-gray-400 font-mono">{m.subjectCode}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn("text-sm font-bold px-2 py-0.5 rounded-lg", gradeColor(m.marks))}>
                            {m.marks}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", gradeColor(m.marks))}>
                            {m.grade ?? "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Fees tab ─────────────────────────────────────────── */}
      {tab === "Fees" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Billed", value: formatCurrency(stats.totalFees), color: "text-gray-900" },
              { label: "Amount Paid", value: formatCurrency(stats.paidFees), color: "text-emerald-600" },
              { label: "Outstanding", value: formatCurrency(Math.max(0, stats.totalFees - stats.paidFees)), color: stats.totalFees > stats.paidFees ? "text-red-600" : "text-gray-400" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
                <p className={cn("text-lg font-extrabold", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Term</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid On</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {studentProp.fees.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No fee records.</td></tr>
                ) : studentProp.fees.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{f.title}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{f.term ?? "—"} {f.academicYear ? `(${f.academicYear})` : ""}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(f.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                        f.status === "PAID" ? "bg-emerald-50 text-emerald-700"
                          : f.status === "PARTIAL" ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-600"
                      )}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {f.paidAt ? formatDate(f.paidAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {studentProp.fees.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-600 uppercase">Total</td>
                    <td className="px-4 py-3 text-right font-extrabold text-gray-900">{formatCurrency(stats.totalFees)}</td>
                    <td />
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-600">{formatCurrency(stats.paidFees)} paid</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── Add Guardian Modal ───────────────────────────────── */}
      {parentModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) closeParentModal() }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">Add Parent / Guardian</h2>
              </div>
              <button onClick={closeParentModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 shrink-0">
              <button
                onClick={() => { setParentModalTab("search"); setModalError(null) }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-colors",
                  parentModalTab === "search" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <Users className="w-4 h-4" /> Search Existing
              </button>
              <button
                onClick={() => { setParentModalTab("new"); setModalError(null) }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-colors",
                  parentModalTab === "new" ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <UserPlus className="w-4 h-4" /> Add New
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* ── Search tab ── */}
              {parentModalTab === "search" && (
                <>
                  <div className="flex gap-2">
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && searchParents()}
                      placeholder="Search by name or phone…"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    <button
                      onClick={searchParents}
                      disabled={searching || !searchQuery.trim()}
                      className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Relation picker for linking */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Relationship to student</label>
                    <select
                      value={linkRelation}
                      onChange={e => setLinkRelation(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  {/* Results */}
                  {searchResults.length > 0 ? (
                    <div className="space-y-2">
                      {searchResults.map(r => {
                        const alreadyLinked = parents.some(p => p.parent.id === r.id)
                        return (
                          <div key={r.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {r.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{r.user.name}</p>
                              <p className="text-xs text-gray-400">{r.user.phone ?? r.phone ?? r.user.email}</p>
                            </div>
                            {alreadyLinked ? (
                              <span className="text-xs text-gray-400 italic">Linked</span>
                            ) : (
                              <button
                                onClick={() => linkExisting(r)}
                                disabled={saving}
                                className="text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                              >
                                {saving ? "Linking…" : "Link"}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : searchQuery && !searching ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-400">No parents found for &ldquo;{searchQuery}&rdquo;.</p>
                      <button onClick={() => { setParentModalTab("new"); setNewP(p => ({ ...p, name: searchQuery })) }} className="mt-2 text-xs font-semibold text-indigo-600 hover:underline">
                        Add a new parent instead →
                      </button>
                    </div>
                  ) : null}
                </>
              )}

              {/* ── Add New tab ── */}
              {parentModalTab === "new" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name <span className="text-red-400">*</span></label>
                    <input
                      value={newP.name}
                      onChange={e => setNewP(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Mary Kofi"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Phone Number <span className="text-red-400">*</span></label>
                    <input
                      value={newP.phone}
                      onChange={e => setNewP(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. 050 123 4567"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email <span className="text-gray-300 text-xs font-normal">(optional)</span></label>
                    <input
                      value={newP.email}
                      onChange={e => setNewP(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="parent@email.com"
                      type="email"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Relationship to Student</label>
                    <select
                      value={newP.relation}
                      onChange={e => setNewP(p => ({ ...p, relation: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Occupation <span className="text-gray-300 text-xs font-normal">(optional)</span></label>
                    <input
                      value={newP.occupation}
                      onChange={e => setNewP(p => ({ ...p, occupation: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Farmer, Trader, Teacher"
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {modalError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{modalError}</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
              <button onClick={closeParentModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              {parentModalTab === "new" && (
                <button
                  onClick={handleAddNew}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Guardian
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove guardian confirmation */}
      <ConfirmModal
        open={!!toUnlink}
        title="Remove Guardian"
        message={`Remove ${toUnlink?.name ?? "this guardian"} from ${studentProp.user.name}?`}
        confirmLabel={unlinking ? "Removing…" : "Remove"}
        danger
        onConfirm={doUnlinkParent}
        onCancel={() => setToUnlink(null)}
      />

      <style jsx global>{`
        @media print {
          header, nav, aside, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
