"use client"

import { useState } from "react"
import { Printer, Users, ClipboardCheck, DollarSign, Banknote, FileBarChart, Lightbulb } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

type Student = {
  id: string
  user: { name: string; email: string }
  class: { name: string; section: string | null } | null
  gender: string | null
  admissionDate: string | Date
  studentId: string | null
}
type AttendanceRecord = { status: string; studentId: string }
type Transaction = { amount: number; type: string; method: string | null; date: string | Date; description: string | null; note: string | null }
type Payslip = {
  id: string; month: number; year: number; basicSalary: number; netPay: number; status: string
  teacher: { user: { name: string } }
}

interface Props {
  students: Student[]
  todayAttendance: AttendanceRecord[]
  transactions: Transaction[]
  payslips: Payslip[]
  schoolName: string
  schoolAddress: string
  schoolPhone: string
}

type Tab = "Students" | "Attendance" | "Finance" | "Payroll"

const TABS: { label: Tab; icon: React.ElementType }[] = [
  { label: "Students", icon: Users },
  { label: "Attendance", icon: ClipboardCheck },
  { label: "Finance", icon: DollarSign },
  { label: "Payroll", icon: Banknote },
]

export default function ReportsClient({ students, todayAttendance, transactions, payslips, schoolName, schoolAddress, schoolPhone }: Props) {
  const [tab, setTab] = useState<Tab>("Students")

  // Attendance stats
  const presentToday = todayAttendance.filter(a => a.status === "PRESENT").length
  const absentToday = todayAttendance.filter(a => a.status === "ABSENT").length
  const lateToday = todayAttendance.filter(a => a.status === "LATE").length
  const markedToday = todayAttendance.length
  const attendanceRate = markedToday > 0 ? Math.round((presentToday / markedToday) * 100) : 0

  // Finance stats
  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)

  // Payroll stats
  const totalNetPay = payslips.reduce((s, p) => s + p.netPay, 0)
  const paidPayslips = payslips.filter(p => p.status === "PAID")
  const totalPaid = paidPayslips.reduce((s, p) => s + p.netPay, 0)

  function handlePrint() {
    window.print()
  }

  const today = new Date()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and print school reports"
        action={
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit print:hidden">
        {TABS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setTab(label)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors",
              tab === label ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Print header (only visible when printing) ── */}
      <div className="hidden print:block mb-6">
        <div className="text-center border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-extrabold text-gray-900">{schoolName}</h1>
          {schoolAddress && <p className="text-sm text-gray-600">{schoolAddress}</p>}
          {schoolPhone && <p className="text-sm text-gray-600">Tel: {schoolPhone}</p>}
          <h2 className="text-lg font-bold mt-3 uppercase tracking-wide">
            {tab} Report — {today.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
          </h2>
        </div>
      </div>

      {/* ── STUDENTS ── */}
      {tab === "Students" && (
        <div id="report-content">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 print:hidden">
            {[
              { label: "Total Students", value: students.length, color: "bg-indigo-50 text-indigo-700" },
              { label: "Male", value: students.filter(s => s.gender === "MALE").length, color: "bg-blue-50 text-blue-700" },
              { label: "Female", value: students.filter(s => s.gender === "FEMALE").length, color: "bg-pink-50 text-pink-700" },
              { label: "Unclassified", value: students.filter(s => !s.class).length, color: "bg-amber-50 text-amber-700" },
            ].map(c => (
              <div key={c.label} className={cn("rounded-2xl p-4 font-semibold", c.color)}>
                <p className="text-2xl font-extrabold">{c.value}</p>
                <p className="text-xs mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Student List ({students.length})</h3>
              <span className="text-xs text-gray-400">Generated: {formatDate(new Date())}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Gender</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No students found.</td></tr>
                  ) : students.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50 print:hover:bg-white">
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{s.user.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{s.studentId ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600">{s.class ? `${s.class.name}${s.class.section ? ` ${s.class.section}` : ""}` : "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500 capitalize">{s.gender?.toLowerCase() ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{s.user.email}</td>
                      <td className="px-4 py-2.5 text-gray-500">{formatDate(s.admissionDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {tab === "Attendance" && (
        <div id="report-content">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Marked Today", value: markedToday, color: "bg-indigo-50 text-indigo-700" },
              { label: "Present", value: presentToday, color: "bg-emerald-50 text-emerald-700" },
              { label: "Absent", value: absentToday, color: "bg-red-50 text-red-700" },
              { label: "Attendance Rate", value: `${attendanceRate}%`, color: "bg-blue-50 text-blue-700" },
            ].map(c => (
              <div key={c.label} className={cn("rounded-2xl p-4", c.color)}>
                <p className="text-2xl font-extrabold">{c.value}</p>
                <p className="text-xs font-semibold mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">
              Today&apos;s Attendance — {today.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </h3>
            {markedToday === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No attendance recorded today yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-12 text-right">{attendanceRate}%</span>
                </div>
                <div className="flex gap-6 text-sm">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" />Present: <strong>{presentToday}</strong></span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" />Absent: <strong>{absentToday}</strong></span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" />Late: <strong>{lateToday}</strong></span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Total students enrolled: <strong>{students.length}</strong> · Marked: <strong>{markedToday}</strong> · Not marked: <strong>{students.length - markedToday}</strong></p>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-4">
            <p className="text-sm text-amber-800 font-medium flex items-start gap-2">
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Tip: For detailed attendance reports by class and date range, use the{" "}
                <a href="/dashboard/attendance" className="underline font-bold">Attendance module</a>.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── FINANCE ── */}
      {tab === "Finance" && (
        <div id="report-content">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Income", value: formatCurrency(totalIncome), sub: `${transactions.filter(t => t.type === "INCOME").length} transactions`, color: "bg-emerald-50 text-emerald-700" },
              { label: "Total Expenses", value: formatCurrency(totalExpense), sub: `${transactions.filter(t => t.type === "EXPENSE").length} transactions`, color: "bg-red-50 text-red-700" },
              { label: "Net Balance", value: formatCurrency(totalIncome - totalExpense), sub: "Income minus expenses", color: "bg-indigo-50 text-indigo-700" },
            ].map(c => (
              <div key={c.label} className={cn("rounded-2xl p-5", c.color)}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">{c.label}</p>
                <p className="text-2xl font-extrabold">{c.value}</p>
                <p className="text-xs mt-1 opacity-70">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No transactions yet.</td></tr>
                  ) : transactions.slice(0, 50).map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50 print:hover:bg-white">
                      <td className="px-4 py-2.5 text-gray-500">{formatDate(t.date)}</td>
                      <td className="px-4 py-2.5 text-gray-700">{t.description ?? t.note ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{t.method ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", t.type === "INCOME" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                          {t.type}
                        </span>
                      </td>
                      <td className={cn("px-4 py-2.5 text-right font-bold", t.type === "INCOME" ? "text-emerald-600" : "text-red-500")}>
                        {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYROLL ── */}
      {tab === "Payroll" && (
        <div id="report-content">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Payslips", value: payslips.length, sub: "All time", color: "bg-indigo-50 text-indigo-700" },
              { label: "Total Net Pay", value: formatCurrency(totalNetPay), sub: "Sum of all payslips", color: "bg-blue-50 text-blue-700" },
              { label: "Total Paid", value: formatCurrency(totalPaid), sub: `${paidPayslips.length} payslips marked paid`, color: "bg-emerald-50 text-emerald-700" },
            ].map(c => (
              <div key={c.label} className={cn("rounded-2xl p-5", c.color)}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">{c.label}</p>
                <p className="text-2xl font-extrabold">{c.value}</p>
                <p className="text-xs mt-1 opacity-70">{c.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Staff Payslips</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Basic</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net Pay</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payslips.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No payslips generated yet.</td></tr>
                  ) : payslips.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 print:hover:bg-white">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{p.teacher.user.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(p.basicSalary)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-indigo-600">{formatCurrency(p.netPay)}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                          p.status === "PAID" ? "bg-emerald-50 text-emerald-700"
                          : p.status === "ISSUED" ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-600")}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {payslips.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      <td colSpan={3} className="px-4 py-3 text-sm text-gray-700">Total</td>
                      <td className="px-4 py-3 text-right text-indigo-600">{formatCurrency(totalNetPay)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          header, nav, aside { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          .overflow-hidden { overflow: visible !important; }
          .shadow-sm, .shadow-2xl { box-shadow: none !important; }
          .rounded-2xl { border-radius: 0 !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  )
}
