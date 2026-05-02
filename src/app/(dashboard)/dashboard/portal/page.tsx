import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
  ClipboardCheck, DollarSign, BookOpen, Bell,
  GraduationCap, FileText, Calendar, ChevronRight,
  User, Users,
} from "lucide-react"

export const dynamic = "force-dynamic"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })
}
function pct(n: number, total: number) {
  return total === 0 ? "—" : `${((n / total) * 100).toFixed(1)}%`
}

const TODAY_DAY = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][new Date().getDay()] as string

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4.5 h-4.5 w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{children}</h2>
}

// ─── Student Portal ───────────────────────────────────────────────────────────
async function StudentPortal({ userId, schoolId }: { userId: string; schoolId: string }) {
  const student = await prisma.student.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      class: {
        select: {
          id: true, name: true, section: true,
          classTeacher: { select: { user: { select: { name: true } } } },
        },
      },
    },
  })

  if (!student) {
    return (
      <div className="text-center py-20 text-gray-500">
        <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">Student profile not found</p>
        <p className="text-sm mt-1">Contact your school administrator.</p>
      </div>
    )
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [totalAttendance, presentCount, feeSlips, recentMarks, todayPeriods, recentNotices, exams] =
    await Promise.all([
      prisma.dailyAttendance.count({ where: { studentId: student.id } }),
      prisma.dailyAttendance.count({ where: { studentId: student.id, status: "PRESENT" } }),
      // Fee slips with item details
      student.class ? prisma.feeSlip.findMany({
        where: { studentId: student.id },
        include: { feeItem: { select: { title: true, term: true, academicYear: true } } },
        orderBy: { dueDate: "asc" },
        take: 6,
      }) : Promise.resolve([]),
      // Recent marks
      prisma.subjectMark.findMany({
        where: { studentId: student.id },
        include: {
          subject: { select: { title: true } },
          // We can't include exam directly here, but we can fetch exam separately
        },
        orderBy: { id: "desc" },
        take: 8,
      }),
      // Today's timetable
      student.classId ? prisma.classRoutine.findMany({
        where: { classId: student.classId, day: TODAY_DAY as any },
        include: { subject: { select: { title: true } } },
        orderBy: { startTime: "asc" },
      }) : Promise.resolve([]),
      prisma.notice.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.exam.findMany({
        where: { schoolId },
        orderBy: [{ academicYear: "desc" }, { startDate: "desc" }],
        take: 5,
        select: { id: true, title: true, term: true, academicYear: true, startDate: true, isPublished: true },
      }),
    ])

  const totalFees = feeSlips.reduce((s, f) => s + f.amount, 0)
  const paidFees  = feeSlips.reduce((s, f) => s + f.paidAmount, 0)
  const outstanding = totalFees - paidFees

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          {student.photo
            ? <img src={student.photo} alt={student.user.name} className="w-14 h-14 rounded-xl object-cover border-2 border-white/40" />
            : (
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-xl font-bold">
                {student.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
            )
          }
          <div>
            <p className="text-lg font-bold">{student.user.name}</p>
            <p className="text-indigo-200 text-sm">
              {student.class ? `${student.class.name}${student.class.section ? ` ${student.class.section}` : ""}` : "No class assigned"}
              {student.rollNumber ? ` · Roll #${student.rollNumber}` : ""}
            </p>
            {student.class?.classTeacher && (
              <p className="text-indigo-200 text-xs mt-0.5">Class Master: {student.class.classTeacher.user.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={ClipboardCheck} label="Attendance" value={pct(presentCount, totalAttendance)}
          sub={`${presentCount} / ${totalAttendance} days`} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={DollarSign} label="Fees Outstanding"
          value={`GH₵ ${outstanding.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`}
          sub={outstanding <= 0 ? "All cleared ✓" : "Due"} color="bg-amber-50 text-amber-600" />
        <StatCard icon={FileText} label="Exams" value={exams.length} sub="This school" color="bg-sky-50 text-sky-600" />
      </div>

      {/* Today's Timetable */}
      <div>
        <SectionTitle>Today&apos;s Schedule — {TODAY_DAY.charAt(0) + TODAY_DAY.slice(1).toLowerCase()}</SectionTitle>
        {todayPeriods.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-400">
            No classes scheduled today
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {todayPeriods.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-4 px-4 py-3 ${i !== 0 ? "border-t border-gray-100" : ""}`}>
                <div className="text-xs text-gray-500 w-20 shrink-0 font-mono">{p.startTime} – {p.endTime}</div>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <p className="text-sm font-medium text-gray-800">{p.subject.title}</p>
                {p.room && <span className="ml-auto text-xs text-gray-400">{p.room}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fee Slips */}
      {feeSlips.length > 0 && (
        <div>
          <SectionTitle>Fee Status</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {feeSlips.map((slip, i) => {
              const statusColor =
                slip.status === "PAID" ? "bg-emerald-50 text-emerald-700" :
                slip.status === "PARTIAL" ? "bg-amber-50 text-amber-700" :
                "bg-red-50 text-red-700"
              return (
                <div key={slip.id} className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? "border-t border-gray-100" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{slip.feeItem.title}</p>
                    <p className="text-xs text-gray-400">
                      {slip.feeItem.term ?? ""}{slip.feeItem.academicYear ? ` · ${slip.feeItem.academicYear}` : ""}
                      {slip.dueDate ? ` · Due ${fmtDate(slip.dueDate)}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">GH₵ {slip.amount.toLocaleString()}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {slip.status}
                    </span>
                  </div>
                </div>
              )
            })}
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Outstanding Balance</span>
              <span className={`text-sm font-bold ${outstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>
                GH₵ {outstanding.toLocaleString("en-GH", { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Exams & Report Cards */}
      {exams.length > 0 && (
        <div>
          <SectionTitle>Examinations & Report Cards</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {exams.map((exam, i) => (
              <Link
                key={exam.id}
                href={`/dashboard/students/${student.id}/report-card?examId=${exam.id}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${i !== 0 ? "border-t border-gray-100" : ""}`}
              >
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{exam.title}</p>
                  <p className="text-xs text-gray-400">
                    {exam.term ?? ""}{exam.academicYear ? ` · ${exam.academicYear}` : ""}
                    {exam.startDate ? ` · ${fmtDate(exam.startDate)}` : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Notices */}
      {recentNotices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Notices</SectionTitle>
            <Link href="/dashboard/notice" className="text-xs text-indigo-600 font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {recentNotices.map(n => (
              <div key={n.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3 shadow-sm">
                <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Parent Portal ────────────────────────────────────────────────────────────
async function ParentPortal({ userId, schoolId }: { userId: string; schoolId: string }) {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true } },
      students: {
        include: {
          student: {
            include: {
              user: { select: { name: true } },
              class: { select: { id: true, name: true, section: true } },
            },
          },
        },
      },
    },
  })

  if (!parent || parent.students.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No children linked to your account</p>
        <p className="text-sm mt-1">Contact your school administrator to link your child.</p>
      </div>
    )
  }

  const childIds = parent.students.map(sp => sp.student.id)

  const [attendanceSummaries, feeSlipSummaries, recentNotices, exams] = await Promise.all([
    // Attendance count per student
    prisma.dailyAttendance.groupBy({
      by: ["studentId"],
      where: { studentId: { in: childIds } },
      _count: { _all: true },
    }).then(async groups => {
      const present = await prisma.dailyAttendance.groupBy({
        by: ["studentId"],
        where: { studentId: { in: childIds }, status: "PRESENT" },
        _count: { _all: true },
      })
      return { total: groups, present }
    }),
    // Fee slips grouped per student
    prisma.feeSlip.findMany({
      where: { studentId: { in: childIds } },
      select: { studentId: true, amount: true, paidAmount: true, status: true },
    }),
    prisma.notice.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.exam.findMany({
      where: { schoolId },
      select: { id: true, title: true, term: true, academicYear: true, startDate: true },
      orderBy: [{ academicYear: "desc" }, { startDate: "desc" }],
      take: 5,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-500 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-lg font-bold">
            {parent.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div>
            <p className="text-base font-bold">{parent.user.name}</p>
            <p className="text-violet-200 text-sm">{parent.students.length} child{parent.students.length !== 1 ? "ren" : ""} enrolled</p>
          </div>
        </div>
      </div>

      {/* Children Cards */}
      <div className="space-y-5">
        {parent.students.map(({ student, relation }) => {
          const attTotal   = attendanceSummaries.total.find(a => a.studentId === student.id)?._count._all ?? 0
          const attPresent = attendanceSummaries.present.find(a => a.studentId === student.id)?._count._all ?? 0
          const mySlips    = feeSlipSummaries.filter(s => s.studentId === student.id)
          const totalFee   = mySlips.reduce((s, f) => s + f.amount, 0)
          const paidFee    = mySlips.reduce((s, f) => s + f.paidAmount, 0)
          const outstanding = totalFee - paidFee

          return (
            <div key={student.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Child header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gray-50">
                {student.photo
                  ? <img src={student.photo} alt={student.user.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  : (
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                      {student.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  )
                }
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{student.user.name}</p>
                  <p className="text-xs text-gray-500">
                    {student.class ? `${student.class.name}${student.class.section ? ` · ${student.class.section}` : ""}` : "No class"}
                    {relation ? ` · ${relation}` : ""}
                  </p>
                </div>
                <Link href={`/dashboard/students/${student.id}`}
                  className="text-xs text-indigo-600 font-medium hover:underline shrink-0">
                  Profile →
                </Link>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
                <div className="p-4 text-center">
                  <p className="text-lg font-bold text-gray-900">{pct(attPresent, attTotal)}</p>
                  <p className="text-xs text-gray-500">Attendance</p>
                  <p className="text-xs text-gray-400">{attPresent}/{attTotal} days</p>
                </div>
                <div className="p-4 text-center">
                  <p className={`text-lg font-bold ${outstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    GH₵ {outstanding.toLocaleString("en-GH", { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-gray-500">Fee Balance</p>
                  <p className="text-xs text-gray-400">{outstanding <= 0 ? "Cleared" : "Outstanding"}</p>
                </div>
              </div>

              {/* Quick links */}
              <div className="flex border-t border-gray-100">
                <Link href={`/dashboard/students/${student.id}/report-card`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors border-r border-gray-100">
                  <FileText className="w-3.5 h-3.5" /> Report Card
                </Link>
                <Link href={`/dashboard/attendance?studentId=${student.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <ClipboardCheck className="w-3.5 h-3.5" /> Attendance
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Exams */}
      {exams.length > 0 && (
        <div>
          <SectionTitle>Upcoming Exams</SectionTitle>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {exams.map((exam, i) => (
              <div key={exam.id} className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? "border-t border-gray-100" : ""}`}>
                <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{exam.title}</p>
                  <p className="text-xs text-gray-400">{exam.term ?? ""}{exam.academicYear ? ` · ${exam.academicYear}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notices */}
      {recentNotices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>School Notices</SectionTitle>
            <Link href="/dashboard/notice" className="text-xs text-indigo-600 font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {recentNotices.map(n => (
              <div key={n.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-start gap-3 shadow-sm">
                <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function PortalPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  const userId   = session?.user?.id
  const role     = session?.user?.role ?? ""

  if (!schoolId || !userId) redirect("/login")

  // Only STUDENT and PARENT use this portal
  if (role !== "STUDENT" && role !== "PARENT") {
    redirect("/dashboard")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-1">
      {role === "STUDENT" && <StudentPortal userId={userId} schoolId={schoolId} />}
      {role === "PARENT"  && <ParentPortal  userId={userId} schoolId={schoolId} />}
    </div>
  )
}
