"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Printer, User, Mail, Phone, MapPin, BookOpen,
  Calendar, Droplets, Globe, Church, Hash, GraduationCap,
  CheckCircle2, XCircle, Clock, TrendingUp, CreditCard,
  AlertCircle, FileText,
} from "lucide-react"
import { formatDate, formatCurrency, cn } from "@/lib/utils"

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
  parent: { occupation: string | null; phone: string | null; user: { name: string; email: string; phone: string | null } }
}
type Student = {
  id: string; rollNumber: string | null; studentId: string | null; gender: string | null
  dateOfBirth: string | null; address: string | null; bloodGroup: string | null
  religion: string | null; nationality: string | null; admissionDate: string; isActive: boolean
  user: { name: string; email: string; phone: string | null; isActive: boolean; avatar: string | null }
  class: { id: string; name: string; section: string | null } | null
  parents: Parent[]; attendance: AttendanceRecord[]; marks: Mark[]; fees: Fee[]
}
type Stats = {
  totalDays: number; present: number; absent: number; late: number
  attendanceRate: number; totalFees: number; paidFees: number
}

const TABS = ["Profile", "Attendance", "Results", "Fees"] as const

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

export default function StudentProfileClient({
  student, stats, school, isAdmin,
}: { student: Student; stats: Stats; school: { name: string; address: string | null; currency: string }; isAdmin: boolean }) {
  const [tab, setTab] = useState<typeof TABS[number]>("Profile")

  const initials = student.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  // Group marks by exam
  const examGroups = student.marks.reduce<Record<string, Mark[]>>((acc, m) => {
    if (!acc[m.examId]) acc[m.examId] = []
    acc[m.examId].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/dashboard/students" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/students/${student.id}/report-card`}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50"
          >
            <FileText className="w-4 h-4" /> Report Card
          </Link>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-semibold text-gray-600 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print Profile
          </button>
        </div>
      </div>

      {/* Print header — only shows when printing */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">{school.name}</h1>
        {school.address && <p className="text-sm text-gray-500">{school.address}</p>}
        <hr className="my-3" />
        <p className="text-xs text-gray-400">Student Profile — Printed {new Date().toLocaleDateString()}</p>
      </div>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white text-2xl font-extrabold flex items-center justify-center shrink-0 shadow-sm">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-gray-900">{student.user.name}</h1>
              <span className={cn(
                "text-xs font-bold px-2.5 py-0.5 rounded-full",
                student.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              )}>
                {student.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              {student.class && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {student.class.name}{student.class.section ? ` ${student.class.section}` : ""}
                </span>
              )}
              {student.studentId && (
                <span className="flex items-center gap-1.5 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded-lg">
                  <Hash className="w-3 h-3" />{student.studentId}
                </span>
              )}
              {student.rollNumber && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">Roll #{student.rollNumber}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{student.user.email}</span>
              {student.user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{student.user.phone}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Admitted {formatDate(student.admissionDate)}</span>
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
            sub: `${student.marks.length} subject marks`,
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

      {/* Tabs — hidden on print */}
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
      {(tab === "Profile" || true) && (
        <div className={cn("space-y-4", tab !== "Profile" && "print:block hidden")}>

          {tab === "Profile" && (
            <>
              {/* Personal info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: User, label: "Full Name", value: student.user.name },
                    { icon: Mail, label: "Email", value: student.user.email },
                    { icon: Phone, label: "Phone", value: student.user.phone },
                    { icon: Calendar, label: "Date of Birth", value: student.dateOfBirth ? formatDate(student.dateOfBirth) : null },
                    { icon: User, label: "Gender", value: student.gender ? student.gender.charAt(0) + student.gender.slice(1).toLowerCase() : null },
                    { icon: Droplets, label: "Blood Group", value: student.bloodGroup },
                    { icon: Globe, label: "Nationality", value: student.nationality },
                    { icon: Church, label: "Religion", value: student.religion },
                    { icon: MapPin, label: "Address", value: student.address },
                    { icon: Calendar, label: "Admission Date", value: formatDate(student.admissionDate) },
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

              {/* Parents */}
              {student.parents.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Parents / Guardians</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {student.parents.map((sp, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center shrink-0">
                          {sp.parent.user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900">{sp.parent.user.name}</p>
                          <p className="text-xs text-indigo-600 font-medium">{sp.relation ?? "Guardian"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{sp.parent.user.email}</p>
                          {(sp.parent.phone || sp.parent.user.phone) && (
                            <p className="text-xs text-gray-400">{sp.parent.phone ?? sp.parent.user.phone}</p>
                          )}
                          {sp.parent.occupation && <p className="text-xs text-gray-400">{sp.parent.occupation}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Attendance tab ───────────────────────────────────── */}
      {tab === "Attendance" && (
        <div className="space-y-4">
          {/* Summary */}
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

            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.attendanceRate}%` }} />
              </div>
              <span className="text-sm font-bold text-gray-600 w-12 text-right">{stats.attendanceRate}%</span>
            </div>
          </div>

          {/* Records */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Note</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {student.attendance.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">No attendance records.</td></tr>
                ) : student.attendance.map((a, i) => {
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
          {/* Summary */}
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
                {student.fees.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No fee records.</td></tr>
                ) : student.fees.map(f => (
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
              {student.fees.length > 0 && (
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

      <style jsx global>{`
        @media print {
          header, nav, aside, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
