import { prisma } from "@/lib/prisma"
import { TrendingUp, TrendingDown, BarChart3, Activity, Trophy } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Server component that fetches and renders three analytics widgets:
 *   - Fees collected per month (last 6 months) — bar chart
 *   - Attendance trend (last 14 days) — area chart
 *   - Top performers (top 5 students by latest exam average)
 *
 * No external chart library — pure SVG/Tailwind to keep bundle size tiny.
 */
export default async function AnalyticsCharts({ schoolId }: { schoolId: string }) {
  // ── Fees per month (last 6 months) ──────────────────────────
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const feeTxs = await prisma.transaction.findMany({
    where: { schoolId, type: "INCOME", status: "COMPLETED", date: { gte: sixMonthsAgo } },
    select: { amount: true, date: true },
  })

  const feesByMonth: { label: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const total = feeTxs
      .filter(t => t.date >= monthStart && t.date < monthEnd)
      .reduce((s, t) => s + t.amount, 0)
    feesByMonth.push({
      label: d.toLocaleDateString("en", { month: "short" }),
      value: total,
    })
  }
  const maxFee = Math.max(...feesByMonth.map(m => m.value), 1)
  const totalFees = feesByMonth.reduce((s, m) => s + m.value, 0)
  const lastMonth = feesByMonth[feesByMonth.length - 1]?.value ?? 0
  const prevMonth = feesByMonth[feesByMonth.length - 2]?.value ?? 0
  const feeTrend = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0

  // ── Attendance last 14 days ──────────────────────────────────
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  const attendanceRows = await prisma.dailyAttendance.findMany({
    where: { schoolId, date: { gte: fourteenDaysAgo } },
    select: { date: true, status: true },
  })

  const attendanceByDay: { label: string; pct: number; total: number; present: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const dayRows = attendanceRows.filter(r => {
      const rd = new Date(r.date)
      rd.setHours(0, 0, 0, 0)
      return rd.getTime() === d.getTime()
    })
    const total = dayRows.length
    const present = dayRows.filter(r => r.status === "PRESENT").length
    const pct = total > 0 ? (present / total) * 100 : 0
    attendanceByDay.push({
      label: d.toLocaleDateString("en", { day: "numeric" }),
      pct,
      total,
      present,
    })
  }

  const totalAttendance = attendanceByDay.reduce((s, d) => s + d.total, 0)
  const totalPresent = attendanceByDay.reduce((s, d) => s + d.present, 0)
  const overallAttendance = totalAttendance > 0 ? (totalPresent / totalAttendance) * 100 : 0

  // ── Top performers (top 5 by avg of most recent exam) ──────
  const recentExam = await prisma.exam.findFirst({
    where: { schoolId },
    orderBy: { startDate: "desc" },
    select: { id: true, title: true },
  })

  const topPerformers = recentExam
    ? await prisma.subjectMark.groupBy({
        by: ["studentId"],
        where: { examId: recentExam.id },
        _avg: { marks: true },
        orderBy: { _avg: { marks: "desc" } },
        take: 5,
      })
    : []

  const studentInfo = topPerformers.length > 0
    ? await prisma.student.findMany({
        where: { id: { in: topPerformers.map(t => t.studentId) } },
        include: {
          user: { select: { name: true } },
          class: { select: { name: true, section: true } },
        },
      })
    : []

  const performers = topPerformers.map(t => {
    const s = studentInfo.find(s => s.id === t.studentId)
    return {
      id: t.studentId,
      name: s?.user.name ?? "Unknown",
      class: s?.class ? `${s.class.name}${s.class.section ? ` ${s.class.section}` : ""}` : "—",
      avg: t._avg.marks ?? 0,
    }
  })

  // ── SVG sizing helpers for the attendance chart
  const chartW = 100
  const chartH = 28
  const points = attendanceByDay.map((d, i) => {
    const x = (i / (attendanceByDay.length - 1)) * chartW
    const y = chartH - (d.pct / 100) * chartH
    return [x, y]
  })
  const polyline = points.map(([x, y]) => `${x},${y}`).join(" ")
  const areaPath =
    `M0,${chartH} ` +
    points.map(([x, y]) => `L${x},${y}`).join(" ") +
    ` L${chartW},${chartH} Z`

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* ── Fees chart ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fee Collection</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">
              GH₵ {totalFees.toLocaleString("en-GH", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Last 6 months</p>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
            feeTrend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          )}>
            {feeTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(feeTrend).toFixed(0)}%
          </div>
        </div>

        <div className="flex items-end gap-2 h-32 mt-6">
          {feesByMonth.map((m) => {
            const h = (m.value / maxFee) * 100
            const isLast = m === feesByMonth[feesByMonth.length - 1]
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full relative flex items-end h-full">
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-all",
                      isLast ? "bg-indigo-600" : "bg-indigo-100"
                    )}
                    style={{ height: `${h}%`, minHeight: m.value > 0 ? "4px" : "0" }}
                    title={`GH₵ ${m.value.toLocaleString()}`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-gray-500">{m.label}</span>
              </div>
            )
          })}
        </div>

        <Link href="/dashboard/finance" className="block mt-4 text-xs text-indigo-600 font-medium hover:underline text-center">
          View finance →
        </Link>
      </div>

      {/* ── Attendance trend ────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendance</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{overallAttendance.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Last 14 days</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-32 overflow-visible">
          <defs>
            <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Reference line at 80% */}
          <line x1="0" y1={chartH - (80 / 100) * chartH} x2={chartW} y2={chartH - (80 / 100) * chartH}
                stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="1 1" />
          <path d={areaPath} fill="url(#attGrad)" />
          <polyline points={polyline} fill="none" stroke="#10b981" strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 0.8 : 0.4} fill="#10b981" />
          ))}
        </svg>

        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>{attendanceByDay[0]?.label}</span>
          <span>{attendanceByDay[Math.floor(attendanceByDay.length / 2)]?.label}</span>
          <span>{attendanceByDay[attendanceByDay.length - 1]?.label} (today)</span>
        </div>

        <Link href="/dashboard/attendance" className="block mt-4 text-xs text-indigo-600 font-medium hover:underline text-center">
          View attendance →
        </Link>
      </div>

      {/* ── Top performers ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Performers</p>
            <p className="text-sm font-bold text-gray-900 mt-1 truncate">
              {recentExam?.title ?? "No exams yet"}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
        </div>

        {performers.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            Mark exam results to see top students
          </p>
        ) : (
          <ul className="space-y-2.5">
            {performers.map((p, idx) => {
              const medals = ["bg-amber-400 text-white", "bg-gray-300 text-white", "bg-orange-400 text-white"]
              return (
                <li key={p.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                    idx < 3 ? medals[idx] : "bg-gray-100 text-gray-500"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.class}</p>
                  </div>
                  <div className={cn(
                    "text-sm font-extrabold",
                    p.avg >= 80 ? "text-emerald-700" :
                    p.avg >= 60 ? "text-blue-700" :
                    p.avg >= 50 ? "text-amber-700" : "text-red-600"
                  )}>
                    {p.avg.toFixed(1)}%
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {recentExam && (
          <Link href="/dashboard/examinations" className="block mt-4 text-xs text-indigo-600 font-medium hover:underline text-center">
            View all results →
          </Link>
        )}
      </div>
    </div>
  )
}
