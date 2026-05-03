"use client"

import { useState } from "react"
import {
  Printer, Users, ClipboardCheck, DollarSign, Banknote, BookOpen,
  Package, Bell, TrendingUp, TrendingDown, BarChart3, GraduationCap,
} from "lucide-react"
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

type AttendanceRecord = { status: string; studentId: string; date?: string | Date }

type Transaction = {
  amount: number
  type: string
  method: string | null
  date: string | Date
  description: string | null
  note: string | null
  studentId?: string | null
}

type Payslip = {
  id: string
  month: number
  year: number
  basicSalary: number
  netPay: number
  status: string
  teacher: { user: { name: string } }
}

type FeeSlip = { amount: number; paidAmount: number; status: string }

type ClassEnrollment = { id: string; name: string; section: string | null; studentCount: number }

interface Props {
  students: Student[]
  teachers: { id: string }[]
  todayAttendance: AttendanceRecord[]
  monthAttendance: AttendanceRecord[]
  transactions: Transaction[]
  payslips: Payslip[]
  feeSlips: FeeSlip[]
  classEnrollment: ClassEnrollment[]
  booksTotal: number
  booksAvailable: number
  activeBookIssues: number
  totalInventoryItems: number
  totalInventoryValue: number
  noticesCount: number
  schoolName: string
  schoolAddress: string
  schoolPhone: string
}

type Tab = "Overview" | "Students" | "Finance" | "Attendance" | "Payroll"

const TABS: { label: Tab; icon: React.ElementType }[] = [
  { label: "Overview", icon: BarChart3 },
  { label: "Students", icon: Users },
  { label: "Finance", icon: DollarSign },
  { label: "Attendance", icon: ClipboardCheck },
  { label: "Payroll", icon: Banknote },
]

export default function ReportsClient({
  students, teachers, todayAttendance, monthAttendance, transactions, payslips,
  feeSlips, classEnrollment, booksTotal, booksAvailable, activeBookIssues,
  totalInventoryItems, totalInventoryValue, noticesCount,
  schoolName, schoolAddress, schoolPhone,
}: Props) {
  const [tab, setTab] = useState<Tab>("Overview")

  // Attendance stats
  const presentToday = todayAttendance.filter(a => a.status === "PRESENT").length
  const absentToday = todayAttendance.filter(a => a.status === "ABSENT").length
  const lateToday = todayAttendance.filter(a => a.status === "LATE").length
  const markedToday = todayAttendance.length
  const attendanceRate = markedToday > 0 ? Math.round((presentToday / markedToday) * 100) : 0

  // Monthly attendance
  const presentMonth = monthAttendance.filter(a => a.status === "PRESENT").length
  const absentMonth = monthAttendance.filter(a => a.status === "ABSENT").length
  const lateMonth = monthAttendance.filter(a => a.status === "LATE").length

  // Finance stats
  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)

  // Fee collection stats
  const totalFees = feeSlips.reduce((s, f) => s + f.amount, 0)
  const collectedFees = feeSlips.reduce((s, f) => s + f.paidAmount, 0)
  const outstandingFees = totalFees - collectedFees
  const feeCollectionRate = totalFees > 0 ? Math.round((collectedFees / totalFees) * 100) : 0

  // Payroll stats
  const totalNetPay = payslips.reduce((s, p) => s + p.netPay, 0)
  const paidPayslips = payslips.filter(p => p.status === "PAID")

  // Recent transactions (last 10)
  const recentTransactions = transactions.slice(0, 10)

  const today = new Date()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        description="School performance overview and detailed reports"
        action={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        }
      />

      {/* Tabs */}
      <div className="overflow-x-auto print:hidden">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit min-w-max">
          {TABS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setTab(label)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap",
                tab === label ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Print header ── */}
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

      {/* ── OVERVIEW TAB ── */}
      {tab === "Overview" && (
        <div className="space-y-6">
          {/* Top stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Students", value: students.length, icon: GraduationCap, color: "bg-indigo-50 text-indigo-600" },
              { label: "Total Staff", value: teachers.length, icon: Users, color: "bg-violet-50 text-violet-600" },
              { label: "Total Revenue", value: formatCurrency(totalIncome), icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
              { label: "Total Expenses", value: formatCurrency(totalExpense), icon: TrendingDown, color: "bg-red-50 text-red-600" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium truncate">{stat.label}</p>
                  <p className="text-lg font-extrabold text-gray-900 truncate">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Fee Collection + Attendance row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fee Collection */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-500" /> Fee Collection
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Collection Rate</span>
                  <span className="font-bold text-gray-900">{feeCollectionRate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${feeCollectionRate}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Total Billed</p>
                    <p className="font-bold text-sm text-gray-800">{formatCurrency(totalFees)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Collected</p>
                    <p className="font-bold text-sm text-emerald-700">{formatCurrency(collectedFees)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="font-bold text-sm text-red-600">{formatCurrency(outstandingFees)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Overview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-indigo-500" /> Attendance (This Month)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Attendance Rate (Today)</span>
                  <span className="font-bold text-gray-900">{attendanceRate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Present</p>
                    <p className="font-bold text-sm text-emerald-700">{presentMonth}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Absent</p>
                    <p className="font-bold text-sm text-red-600">{absentMonth}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Late</p>
                    <p className="font-bold text-sm text-amber-600">{lateMonth}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Library + Inventory row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-500" /> Library
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-sky-50 rounded-xl p-3">
                  <p className="text-xl font-extrabold text-sky-700">{booksTotal}</p>
                  <p className="text-xs text-sky-600 font-medium mt-0.5">Books</p>
                </div>
                <div className="text-center bg-emerald-50 rounded-xl p-3">
                  <p className="text-xl font-extrabold text-emerald-700">{booksAvailable}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">Available</p>
                </div>
                <div className="text-center bg-amber-50 rounded-xl p-3">
                  <p className="text-xl font-extrabold text-amber-700">{activeBookIssues}</p>
                  <p className="text-xs text-amber-600 font-medium mt-0.5">Issued</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" /> Inventory
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center bg-orange-50 rounded-xl p-3">
                  <p className="text-xl font-extrabold text-orange-700">{totalInventoryItems}</p>
                  <p className="text-xs text-orange-600 font-medium mt-0.5">Item Types</p>
                </div>
                <div className="text-center bg-amber-50 rounded-xl p-3">
                  <p className="text-lg font-extrabold text-amber-700">{formatCurrency(totalInventoryValue)}</p>
                  <p className="text-xs text-amber-600 font-medium mt-0.5">Est. Value</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">{noticesCount} active notice{noticesCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {/* Class Enrollment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Class Enrollment</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Students</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {classEnrollment.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">No classes yet.</td></tr>
                  ) : classEnrollment.map(c => {
                    const share = students.length > 0 ? Math.round((c.studentCount / students.length) * 100) : 0
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {c.name}{c.section ? ` ${c.section}` : ""}
                        </td>
                        <td className="px-4 py-3 font-bold text-indigo-700">{c.studentCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Recent Transactions</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No transactions yet.</p>
              ) : recentTransactions.map((t, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    t.type === "INCOME" ? "bg-emerald-50" : "bg-red-50"
                  )}>
                    {t.type === "INCOME"
                      ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                      : <TrendingDown className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.description ?? t.note ?? "Payment"}</p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                  </div>
                  <span className={cn("text-sm font-bold shrink-0",
                    t.type === "INCOME" ? "text-emerald-600" : "text-red-500"
                  )}>
                    {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STUDENTS TAB ── */}
      {tab === "Students" && (
        <div id="report-content">
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

      {/* ── FINANCE TAB ── */}
      {tab === "Finance" && (
        <div id="report-content" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          {/* Fee Collection Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">Fee Collection Summary</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Total Billed</p>
                <p className="text-xl font-extrabold text-gray-900">{formatCurrency(totalFees)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Collected</p>
                <p className="text-xl font-extrabold text-emerald-700">{formatCurrency(collectedFees)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Outstanding</p>
                <p className="text-xl font-extrabold text-red-600">{formatCurrency(outstandingFees)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${feeCollectionRate}%` }} />
              </div>
              <span className="text-sm font-bold text-gray-900 w-12 text-right">{feeCollectionRate}%</span>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span><span className="w-2.5 h-2.5 inline-block rounded-full bg-emerald-400 mr-1" />Paid: {feeSlips.filter(f => f.status === "PAID").length}</span>
              <span><span className="w-2.5 h-2.5 inline-block rounded-full bg-amber-400 mr-1" />Partial: {feeSlips.filter(f => f.status === "PARTIAL").length}</span>
              <span><span className="w-2.5 h-2.5 inline-block rounded-full bg-red-400 mr-1" />Unpaid: {feeSlips.filter(f => f.status === "UNPAID").length}</span>
            </div>
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
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                          t.type === "INCOME" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        )}>
                          {t.type}
                        </span>
                      </td>
                      <td className={cn("px-4 py-2.5 text-right font-bold",
                        t.type === "INCOME" ? "text-emerald-600" : "text-red-500"
                      )}>
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

      {/* ── ATTENDANCE TAB ── */}
      {tab === "Attendance" && (
        <div id="report-content" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

          {/* Today's attendance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">
              Today — {today.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </h3>
            {markedToday === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No attendance recorded today yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${attendanceRate}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-12 text-right">{attendanceRate}%</span>
                </div>
                <div className="flex gap-6 text-sm">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" />Present: <strong>{presentToday}</strong></span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" />Absent: <strong>{absentToday}</strong></span>
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" />Late: <strong>{lateToday}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Monthly summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">
              {MONTHS[today.getMonth()]} {today.getFullYear()} Summary
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center bg-emerald-50 rounded-xl p-4">
                <p className="text-2xl font-extrabold text-emerald-700">{presentMonth}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">Present Records</p>
              </div>
              <div className="text-center bg-red-50 rounded-xl p-4">
                <p className="text-2xl font-extrabold text-red-700">{absentMonth}</p>
                <p className="text-xs text-red-600 font-semibold mt-0.5">Absent Records</p>
              </div>
              <div className="text-center bg-amber-50 rounded-xl p-4">
                <p className="text-2xl font-extrabold text-amber-700">{lateMonth}</p>
                <p className="text-xs text-amber-600 font-semibold mt-0.5">Late Records</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYROLL TAB ── */}
      {tab === "Payroll" && (
        <div id="report-content" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Payslips", value: payslips.length, sub: "All time", color: "bg-indigo-50 text-indigo-700" },
              { label: "Total Net Pay", value: formatCurrency(totalNetPay), sub: "Sum of all payslips", color: "bg-blue-50 text-blue-700" },
              { label: "Total Paid", value: formatCurrency(paidPayslips.reduce((s, p) => s + p.netPay, 0)), sub: `${paidPayslips.length} payslips marked paid`, color: "bg-emerald-50 text-emerald-700" },
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
                          : "bg-gray-100 text-gray-600"
                        )}>
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
          button { display: none !important; }
        }
      `}</style>
    </div>
  )
}
