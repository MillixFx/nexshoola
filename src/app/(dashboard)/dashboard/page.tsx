import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import {
  Users, GraduationCap, DollarSign, ClipboardCheck,
  TrendingUp, Calendar, Bell, UserCheck, BookOpen,
  ArrowRight, FileText, Library, Lightbulb,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const role = (session?.user as any)?.role ?? "ADMIN"
  const firstName = (session?.user?.name ?? "User").split(" ")[0]

  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Shared: notices + events for all roles ──────────────────────────
  const [recentNotices, upcomingEvents] = await Promise.all([
    prisma.notice.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.calendarEvent.findMany({
      where: { schoolId, startDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 4,
    }),
  ])

  // ── Role-specific stats ─────────────────────────────────────────────
  let stats: { label: string; value: string; sub: string; icon: React.ElementType; color: string; href: string }[] = []
  let quickLinks: { label: string; value: number | string; icon: React.ElementType; href: string; color: string }[] = []

  if (role === "ADMIN" || role === "HEADMASTER") {
    const [studentCount, teacherCount, parentCount, classCount, todayPresent, todayTotal, totalIncome, pendingLeave] =
      await Promise.all([
        prisma.student.count({ where: { schoolId, isActive: true } }),
        prisma.teacher.count({ where: { schoolId, isActive: true } }),
        prisma.parent.count({ where: { schoolId } }),
        prisma.class.count({ where: { schoolId } }),
        prisma.dailyAttendance.count({ where: { schoolId, date: today, status: "PRESENT" } }),
        prisma.dailyAttendance.count({ where: { schoolId, date: today } }),
        prisma.transaction.aggregate({ where: { schoolId, type: "INCOME" }, _sum: { amount: true } }),
        prisma.leaveApplication.count({ where: { schoolId, status: "PENDING" } }),
      ])

    const attendancePct = todayTotal > 0 ? `${((todayPresent / todayTotal) * 100).toFixed(1)}%` : "—"
    const fees = totalIncome._sum.amount ?? 0

    stats = [
      { label: "Total Students",    value: studentCount.toLocaleString(),  sub: "Active enrolments", icon: Users,         color: "bg-indigo-50 text-indigo-600",  href: "/dashboard/students" },
      { label: "Total Teachers",    value: teacherCount.toLocaleString(),  sub: "Active staff",      icon: GraduationCap, color: "bg-emerald-50 text-emerald-600", href: "/dashboard/teachers" },
      { label: "Fees Collected",    value: `GH₵ ${fees.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`, sub: "Total income", icon: DollarSign, color: "bg-amber-50 text-amber-600", href: "/dashboard/finance" },
      { label: "Attendance Today",  value: todayTotal > 0 ? attendancePct : "Not marked", sub: `${todayPresent}/${todayTotal} present`, icon: ClipboardCheck, color: "bg-sky-50 text-sky-600", href: "/dashboard/attendance" },
    ]
    quickLinks = [
      { label: "Classes",       value: classCount,    icon: BookOpen,  href: "/dashboard/classes",  color: "text-violet-600 bg-violet-50" },
      { label: "Parents",       value: parentCount,   icon: UserCheck, href: "/dashboard/parents",  color: "text-pink-600 bg-pink-50" },
      { label: "Leave Pending", value: pendingLeave,  icon: Calendar,  href: "/dashboard/leave",    color: "text-orange-600 bg-orange-50" },
      { label: "Notices",       value: recentNotices.length, icon: Bell, href: "/dashboard/notice", color: "text-teal-600 bg-teal-50" },
    ]

  } else if (role === "TEACHER") {
    const [studentCount, classCount, todayPresent, todayTotal, myLeave, examCount] = await Promise.all([
      prisma.student.count({ where: { schoolId, isActive: true } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.dailyAttendance.count({ where: { schoolId, date: today, status: "PRESENT" } }),
      prisma.dailyAttendance.count({ where: { schoolId, date: today } }),
      prisma.leaveApplication.count({ where: { schoolId, status: "PENDING" } }),
      prisma.exam.count({ where: { schoolId } }),
    ])
    const attendancePct = todayTotal > 0 ? `${((todayPresent / todayTotal) * 100).toFixed(1)}%` : "Not marked"

    stats = [
      { label: "Students",         value: studentCount.toLocaleString(), sub: "Enrolled",        icon: Users,         color: "bg-indigo-50 text-indigo-600",  href: "/dashboard/students" },
      { label: "Classes",          value: classCount.toLocaleString(),   sub: "Total classes",   icon: BookOpen,      color: "bg-emerald-50 text-emerald-600", href: "/dashboard/classes" },
      { label: "Attendance Today", value: attendancePct,                 sub: `${todayPresent}/${todayTotal} present`, icon: ClipboardCheck, color: "bg-sky-50 text-sky-600", href: "/dashboard/attendance" },
      { label: "Examinations",     value: examCount.toLocaleString(),    sub: "Total exams",     icon: FileText,      color: "bg-amber-50 text-amber-600",    href: "/dashboard/examinations" },
    ]
    quickLinks = [
      { label: "Notice Board",  value: recentNotices.length, icon: Bell,        href: "/dashboard/notice",       color: "text-indigo-600 bg-indigo-50" },
      { label: "Leave Pending", value: myLeave,              icon: Calendar,    href: "/dashboard/leave",        color: "text-orange-600 bg-orange-50" },
      { label: "Library",       value: "Browse",             icon: Library,     href: "/dashboard/library",      color: "text-teal-600 bg-teal-50" },
      { label: "Suggestions",   value: "Submit",             icon: Lightbulb,   href: "/dashboard/suggestions",  color: "text-amber-600 bg-amber-50" },
    ]

  } else if (role === "STUDENT") {
    const [myAttendance, myTotalAttendance, examCount, bookCount] = await Promise.all([
      prisma.dailyAttendance.count({ where: { schoolId, status: "PRESENT" } }),
      prisma.dailyAttendance.count({ where: { schoolId } }),
      prisma.exam.count({ where: { schoolId } }),
      prisma.book.count({ where: { schoolId } }),
    ])
    const pct = myTotalAttendance > 0 ? `${((myAttendance / myTotalAttendance) * 100).toFixed(1)}%` : "—"

    stats = [
      { label: "My Attendance",  value: pct,                        sub: `${myAttendance}/${myTotalAttendance} days`, icon: ClipboardCheck, color: "bg-emerald-50 text-emerald-600", href: "/dashboard/attendance" },
      { label: "Examinations",   value: examCount.toLocaleString(), sub: "Total exams",                               icon: FileText,       color: "bg-indigo-50 text-indigo-600",  href: "/dashboard/examinations" },
      { label: "Library Books",  value: bookCount.toLocaleString(), sub: "Catalogued",                                icon: Library,       color: "bg-amber-50 text-amber-600",    href: "/dashboard/library" },
      { label: "Upcoming Events",value: upcomingEvents.length.toString(), sub: "This term",                          icon: Calendar,      color: "bg-sky-50 text-sky-600",        href: "/dashboard/calendar" },
    ]
    quickLinks = [
      { label: "Notice Board",  value: recentNotices.length,   icon: Bell,      href: "/dashboard/notice",       color: "text-indigo-600 bg-indigo-50" },
      { label: "Messages",      value: "Inbox",                icon: GraduationCap, href: "/dashboard/messages", color: "text-emerald-600 bg-emerald-50" },
      { label: "Suggestions",   value: "Submit",               icon: Lightbulb, href: "/dashboard/suggestions",  color: "text-amber-600 bg-amber-50" },
      { label: "Calendar",      value: upcomingEvents.length,  icon: Calendar,  href: "/dashboard/calendar",     color: "text-violet-600 bg-violet-50" },
    ]

  } else if (role === "PARENT") {
    const [childCount, totalFees, noticeCount, eventCount] = await Promise.all([
      prisma.student.count({ where: { schoolId, isActive: true } }),
      prisma.transaction.aggregate({ where: { schoolId, type: "INCOME" }, _sum: { amount: true } }),
      prisma.notice.count({ where: { schoolId } }),
      prisma.calendarEvent.count({ where: { schoolId, startDate: { gte: new Date() } } }),
    ])
    const fees = totalFees._sum.amount ?? 0

    stats = [
      { label: "Students",        value: childCount.toLocaleString(),   sub: "Enrolled",          icon: Users,         color: "bg-indigo-50 text-indigo-600",  href: "/dashboard/students" },
      { label: "Fees Paid",       value: `GH₵ ${fees.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`, sub: "Total collected", icon: DollarSign, color: "bg-emerald-50 text-emerald-600", href: "/dashboard/finance" },
      { label: "Notices",         value: noticeCount.toLocaleString(),  sub: "From school",       icon: Bell,          color: "bg-amber-50 text-amber-600",    href: "/dashboard/notice" },
      { label: "Upcoming Events", value: eventCount.toLocaleString(),   sub: "This term",         icon: Calendar,      color: "bg-sky-50 text-sky-600",        href: "/dashboard/calendar" },
    ]
    quickLinks = [
      { label: "Attendance",   value: "View",    icon: ClipboardCheck, href: "/dashboard/attendance",  color: "text-sky-600 bg-sky-50" },
      { label: "Library",      value: "Browse",  icon: Library,        href: "/dashboard/library",     color: "text-teal-600 bg-teal-50" },
      { label: "Messages",     value: "Inbox",   icon: UserCheck,      href: "/dashboard/messages",    color: "text-violet-600 bg-violet-50" },
      { label: "Suggestions",  value: "Submit",  icon: Lightbulb,      href: "/dashboard/suggestions", color: "text-amber-600 bg-amber-50" },
    ]
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Good {getTimeOfDay()}, {firstName} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {school?.name ?? "Your School"} · {new Date().toLocaleDateString("en-GH", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
              <p className="text-xs font-medium text-gray-500">{stat.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{stat.sub}</p>
            </Link>
          )
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickLinks.map((q) => {
          const Icon = q.icon
          return (
            <Link
              key={q.label}
              href={q.href}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className={`w-9 h-9 rounded-xl ${q.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none">{q.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{q.label}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom grid: notices + events */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Recent Notices</h2>
            <Link href="/dashboard/notice" className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentNotices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No notices yet</p>
          ) : (
            <div className="space-y-3">
              {recentNotices.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.createdAt.toLocaleDateString("en-GH", { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Upcoming Events</h2>
            <Link href="/dashboard/calendar" className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="bg-indigo-600 text-white rounded-xl px-2.5 py-1.5 text-center min-w-[42px] shrink-0">
                    <p className="text-sm font-bold leading-none">{new Date(e.startDate).getDate()}</p>
                    <p className="text-xs opacity-80">{new Date(e.startDate).toLocaleDateString("en", { month: "short" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                    {e.type && <span className="text-xs text-indigo-600 font-medium">{e.type}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}
