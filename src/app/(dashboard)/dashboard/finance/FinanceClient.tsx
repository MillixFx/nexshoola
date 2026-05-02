"use client"

import { useState, useEffect } from "react"
import { DollarSign, Plus, TrendingUp, TrendingDown, CreditCard, FileText,
         Loader2, X, Printer, ExternalLink, Users, CheckCircle2, AlertCircle } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

type Transaction = {
  id: string; amount: number; type: string; method: string | null; status: string
  reference: string | null; note: string | null; description: string | null; date: string | Date
  studentName?: string | null; feeItemTitle?: string | null
}
type FeeItem = {
  id: string; title: string; amount: number; term: string | null; academicYear: string | null
  class: { name: string; section: string | null } | null
}
type Student = { id: string; user: { name: string } }
type Class = { id: string; name: string; section: string | null }
type FeeSlip = {
  id: string; amount: number; paidAmount: number; status: string; dueDate: string | null; paidAt: string | null
  student: { id: string; rollNumber: string | null; user: { name: string; email: string }; class: { name: string; section: string | null } | null }
  feeItem: { id: string; title: string; term: string | null; academicYear: string | null }
}

interface Props {
  transactions: Transaction[]
  feeItems: FeeItem[]
  students: Student[]
  classes: Class[]
  schoolId: string
  isAdmin?: boolean
  userEmail?: string
}

const TABS = ["Overview", "Transactions", "Fee Items", "Fee Slips"] as const
const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700",
  UNPAID: "bg-red-50 text-red-600",
  PARTIAL: "bg-amber-50 text-amber-700",
}

export default function FinanceClient({
  transactions: initialTx, feeItems: initialFees, students, classes, schoolId, isAdmin = true, userEmail = ""
}: Props) {
  const [tab, setTab] = useState<typeof TABS[number]>("Overview")
  const [transactions, setTransactions] = useState(initialTx)
  const [feeItems, setFeeItems] = useState(initialFees)

  // Modals
  const [showPayment, setShowPayment] = useState(false)
  const [showFeeModal, setShowFeeModal] = useState(false)
  const [showPaystackModal, setShowPaystackModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const [saving, setSaving] = useState(false)
  const [paystackLoading, setPaystackLoading] = useState(false)
  const [error, setError] = useState("")

  // Fee slips state
  const [feeSlips, setFeeSlips] = useState<FeeSlip[]>([])
  const [slipsLoading, setSlipsLoading] = useState(false)
  const [slipClassFilter, setSlipClassFilter] = useState("")
  const [slipFeeFilter, setSlipFeeFilter] = useState("")
  const [slipStatusFilter, setSlipStatusFilter] = useState("")

  // Forms
  const [payForm, setPayForm] = useState({ studentId: "", feeItemId: "", slipId: "", amount: "", method: "CASH", reference: "", note: "" })
  const [paySlipBalance, setPaySlipBalance] = useState<{ owed: number; paid: number } | null>(null)
  const [feeForm, setFeeForm] = useState({ title: "", amount: "", classId: "", term: "Term 1", academicYear: new Date().getFullYear().toString() })
  const [paystackForm, setPaystackForm] = useState({ feeItemId: "", amount: "" })
  const [assignForm, setAssignForm] = useState({ feeItemId: "", classId: "", dueDate: "" })
  const [assignResult, setAssignResult] = useState<{ created: number; skipped: number; message: string } | null>(null)

  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)

  // Load fee slips
  useEffect(() => {
    if (tab !== "Fee Slips") return
    setSlipsLoading(true)
    const params = new URLSearchParams({ schoolId })
    if (slipClassFilter) params.set("classId", slipClassFilter)
    if (slipFeeFilter) params.set("feeItemId", slipFeeFilter)
    if (slipStatusFilter) params.set("status", slipStatusFilter)
    fetch(`/api/fee-slips?${params}`)
      .then(r => r.json())
      .then(setFeeSlips)
      .finally(() => setSlipsLoading(false))
  }, [tab, slipClassFilter, slipFeeFilter, slipStatusFilter])

  function openPayModal(opts: { studentId?: string; feeItemId?: string; slipId?: string; amount?: number; owed?: number; paid?: number } = {}) {
    setPayForm({
      studentId: opts.studentId ?? "",
      feeItemId: opts.feeItemId ?? "",
      slipId:    opts.slipId    ?? "",
      amount:    opts.amount != null ? String(opts.amount) : "",
      method: "CASH", reference: "", note: "",
    })
    setPaySlipBalance(opts.owed != null ? { owed: opts.owed, paid: opts.paid ?? 0 } : null)
    setError("")
    setShowPayment(true)
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/finance/transaction", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payForm, schoolId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { transaction: tx, slip } = await res.json()
      setTransactions(prev => [tx, ...prev])
      // Refresh fee slips list if we're on that tab
      if (slip) {
        setFeeSlips(prev => prev.map(s => s.id === slip.id ? { ...s, paidAmount: slip.paidAmount, status: slip.status, paidAt: slip.paidAt } : s))
      }
      setShowPayment(false)
      setPayForm({ studentId: "", feeItemId: "", slipId: "", amount: "", method: "CASH", reference: "", note: "" })
      setPaySlipBalance(null)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleFeeItem(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/finance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...feeForm, type: "fee_item", schoolId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const item = await res.json()
      setFeeItems(prev => [...prev, item])
      setShowFeeModal(false)
      setFeeForm({ title: "", amount: "", classId: "", term: "Term 1", academicYear: new Date().getFullYear().toString() })
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function handlePayOnline(e: React.FormEvent) {
    e.preventDefault()
    const fee = feeItems.find(f => f.id === paystackForm.feeItemId)
    const amount = parseFloat(paystackForm.amount || fee?.amount.toString() || "0")
    if (!amount || amount <= 0) { setError("Please enter a valid amount"); return }
    setPaystackLoading(true); setError("")
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(amount * 100), type: "FEE", metadata: { feeItemId: paystackForm.feeItemId, schoolId, email: userEmail } }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      if (data.authorization_url) {
        window.open(data.authorization_url, "_blank")
        setShowPaystackModal(false)
      } else throw new Error("No payment URL returned")
    } catch (err: any) { setError(err.message || "Payment initialization failed") }
    finally { setPaystackLoading(false) }
  }

  async function handleAssignFees(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setAssignResult(null)
    try {
      const res = await fetch("/api/fee-slips", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...assignForm, schoolId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const result = await res.json()
      setAssignResult(result)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Manage school fees, payments and transactions"
        action={
          <div className="flex gap-2 flex-wrap">
            {!isAdmin ? (
              <button
                onClick={() => { setShowPaystackModal(true); setError(""); setPaystackForm({ feeItemId: "", amount: "" }) }}
                className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-700 shadow-sm"
              >
                <CreditCard className="w-4 h-4" /> Pay Online
              </button>
            ) : (
              <>
                <button onClick={() => window.print()} className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-3 py-2.5 rounded-xl hover:bg-gray-50">
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setShowAssignModal(true); setError(""); setAssignResult(null); setAssignForm({ feeItemId: "", classId: "", dueDate: "" }) }}
                  className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-700 shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Assign Fees</span>
                </button>
                <button onClick={() => { setShowFeeModal(true); setError("") }} className="flex items-center gap-2 border border-indigo-200 text-indigo-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-50">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Fee Item</span>
                </button>
                <button onClick={() => openPayModal()} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Record Payment</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Income", value: formatCurrency(totalIncome), icon: TrendingUp, color: "bg-emerald-50 text-emerald-600" },
          { label: "Total Expenses", value: formatCurrency(totalExpense), icon: TrendingDown, color: "bg-red-50 text-red-600" },
          { label: "Net Balance", value: formatCurrency(totalIncome - totalExpense), icon: DollarSign, color: "bg-indigo-50 text-indigo-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", s.color)}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit min-w-max">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg whitespace-nowrap", tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ─────────────────────────────────────────── */}
      {tab === "Overview" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center gap-3 py-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", t.type === "INCOME" ? "bg-emerald-50" : "bg-red-50")}>
                    <CreditCard className={cn("w-4 h-4", t.type === "INCOME" ? "text-emerald-600" : "text-red-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.feeItemTitle ?? t.description ?? t.note ?? "Payment"}</p>
                    <p className="text-xs text-gray-400">{t.studentName ?? "—"} · {formatDate(t.date)}</p>
                  </div>
                  <span className={cn("text-sm font-bold shrink-0", t.type === "INCOME" ? "text-emerald-600" : "text-red-500")}>
                    {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Transactions ─────────────────────────────────────── */}
      {tab === "Transactions" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Fee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Method</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No transactions.</td></tr>
                ) : transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.studentName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{t.feeItemTitle ?? t.description ?? t.note ?? "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">{t.method ?? "—"}</span>
                    </td>
                    <td className={cn("px-4 py-3 text-right font-bold", t.type === "INCOME" ? "text-emerald-600" : "text-red-500")}>
                      {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Fee Items ─────────────────────────────────────────── */}
      {tab === "Fee Items" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Class</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Term</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                {!isAdmin && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Pay</th>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {feeItems.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No fee items yet.</td></tr>
                ) : feeItems.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{f.title}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{f.class ? `${f.class.name}${f.class.section ? ` ${f.class.section}` : ""}` : "All Classes"}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{f.term ?? "—"} {f.academicYear ? `(${f.academicYear})` : ""}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600">{formatCurrency(f.amount)}</td>
                    {!isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => { setPaystackForm({ feeItemId: f.id, amount: String(f.amount) }); setShowPaystackModal(true); setError("") }}
                          className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full hover:bg-emerald-100 flex items-center gap-1 mx-auto"
                        >
                          <ExternalLink className="w-3 h-3" /> Pay
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Fee Slips ─────────────────────────────────────────── */}
      {tab === "Fee Slips" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-wrap gap-3">
              <select className="input flex-1 min-w-[140px]" value={slipClassFilter} onChange={e => setSlipClassFilter(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>)}
              </select>
              <select className="input flex-1 min-w-[140px]" value={slipFeeFilter} onChange={e => setSlipFeeFilter(e.target.value)}>
                <option value="">All Fee Items</option>
                {feeItems.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
              <select className="input flex-1 min-w-[120px]" value={slipStatusFilter} onChange={e => setSlipStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>

          {slipsLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : feeSlips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
              <FileText className="w-10 h-10 text-indigo-300 mb-3" />
              <h2 className="font-bold text-gray-800 mb-1">No fee slips found</h2>
              <p className="text-sm text-gray-400 mb-4">Use "Assign Fees" to assign fee items to a class.</p>
              {isAdmin && (
                <button
                  onClick={() => { setShowAssignModal(true); setAssignResult(null); setError("") }}
                  className="text-sm font-semibold text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-50"
                >
                  + Assign Fees to Class
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">{feeSlips.length} fee slip{feeSlips.length !== 1 ? "s" : ""}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" />Paid: {feeSlips.filter(s => s.status === "PAID").length}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full" />Unpaid: {feeSlips.filter(s => s.status === "UNPAID").length}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full" />Partial: {feeSlips.filter(s => s.status === "PARTIAL").length}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead><tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Fee</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Owed</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Paid</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {feeSlips.map(slip => {
                      const outstanding = slip.amount - slip.paidAmount
                      return (
                        <tr key={slip.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{slip.student.user.name}</p>
                            <p className="text-xs text-gray-400">{slip.student.user.email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                            {slip.student.class ? `${slip.student.class.name}${slip.student.class.section ? ` ${slip.student.class.section}` : ""}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                            <p className="text-xs">{slip.feeItem.title}</p>
                            {slip.feeItem.term && <p className="text-xs text-gray-400">{slip.feeItem.term}</p>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-semibold text-gray-800">{formatCurrency(slip.amount)}</p>
                            {outstanding > 0 && outstanding < slip.amount && (
                              <p className="text-[10px] text-amber-600 font-medium">{formatCurrency(outstanding)} left</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right hidden sm:table-cell">
                            {slip.paidAmount > 0 ? (
                              <span className="text-sm font-semibold text-emerald-600">{formatCurrency(slip.paidAmount)}</span>
                            ) : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", STATUS_COLORS[slip.status] ?? "bg-gray-100 text-gray-600")}>
                              {slip.status}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-center">
                              {slip.status !== "PAID" ? (
                                <button
                                  onClick={() => openPayModal({
                                    studentId: slip.student.id,
                                    feeItemId: slip.feeItem.id,
                                    slipId:    slip.id,
                                    amount:    Math.max(0, outstanding),
                                    owed:      slip.amount,
                                    paid:      slip.paidAmount,
                                  })}
                                  className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-3 py-1 rounded-full hover:bg-indigo-100 whitespace-nowrap"
                                >
                                  + Pay
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-500 font-semibold">✓ Done</span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Assign Fees Modal ─────────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Assign Fee to Class</h2>
                <p className="text-xs text-gray-400 mt-0.5">Creates a fee slip for every active student in the class</p>
              </div>
              <button onClick={() => { setShowAssignModal(false); setAssignResult(null) }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAssignFees} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

              {assignResult && (
                <div className={cn("p-4 rounded-xl flex items-start gap-3", assignResult.created > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200")}>
                  {assignResult.created > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                  <div>
                    <p className={cn("text-sm font-semibold", assignResult.created > 0 ? "text-emerald-800" : "text-amber-800")}>{assignResult.message}</p>
                    {assignResult.skipped > 0 && <p className="text-xs text-gray-500 mt-0.5">{assignResult.skipped} already assigned — skipped</p>}
                  </div>
                </div>
              )}

              <div>
                <label className="label">Fee Item *</label>
                <select className="input" required value={assignForm.feeItemId} onChange={e => setAssignForm(f => ({ ...f, feeItemId: e.target.value }))}>
                  <option value="">— Select fee item —</option>
                  {feeItems.map(f => <option key={f.id} value={f.id}>{f.title} ({formatCurrency(f.amount)})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Class *</label>
                <select className="input" required value={assignForm.classId} onChange={e => setAssignForm(f => ({ ...f, classId: e.target.value }))}>
                  <option value="">— Select class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="date" className="input" value={assignForm.dueDate} onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAssignModal(false); setAssignResult(null) }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {assignResult ? "Close" : "Cancel"}
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</> : <><Users className="w-4 h-4" /> Assign to Class</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ─────────────────────────────── */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

              {/* Outstanding balance banner (shown when opened from a fee slip row) */}
              {paySlipBalance && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Outstanding Balance</p>
                    <p className="text-xl font-extrabold text-amber-700">{formatCurrency(paySlipBalance.owed - paySlipBalance.paid)}</p>
                  </div>
                  <div className="text-right text-xs text-amber-600">
                    <p>Total: {formatCurrency(paySlipBalance.owed)}</p>
                    <p>Paid: {formatCurrency(paySlipBalance.paid)}</p>
                  </div>
                </div>
              )}

              <div><label className="label">Student</label>
                <select className="input" value={payForm.studentId} onChange={e => setPayForm(f => ({ ...f, studentId: e.target.value }))}>
                  <option value="">— Select student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.user.name}</option>)}
                </select>
              </div>
              <div><label className="label">Fee Item</label>
                <select className="input" value={payForm.feeItemId} onChange={e => {
                  const item = feeItems.find(f => f.id === e.target.value)
                  setPayForm(f => ({ ...f, feeItemId: e.target.value, amount: item ? String(item.amount) : f.amount }))
                }}>
                  <option value="">— Select fee item —</option>
                  {feeItems.map(f => <option key={f.id} value={f.id}>{f.title} ({formatCurrency(f.amount)})</option>)}
                </select>
              </div>
              <div><label className="label">Amount *</label>
                <input className="input" type="number" min="0" step="0.01" required value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div><label className="label">Payment Method</label>
                <select className="input" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE", "CARD"].map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Reference / Receipt</label><input className="input" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="RCP-001" /></div>
                <div><label className="label">Note</label><input className="input" value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPayment(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Fee Item Modal ──────────────────────────────────── */}
      {showFeeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Fee Item</h2>
              <button onClick={() => setShowFeeModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleFeeItem} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div><label className="label">Title *</label><input className="input" required value={feeForm.title} onChange={e => setFeeForm(f => ({ ...f, title: e.target.value }))} placeholder="School Fees Term 1" /></div>
              <div><label className="label">Amount (GHS) *</label><input className="input" type="number" min="0" required value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} placeholder="500.00" /></div>
              <div><label className="label">Class <span className="text-gray-400 font-normal">(leave blank for all)</span></label>
                <select className="input" value={feeForm.classId} onChange={e => setFeeForm(f => ({ ...f, classId: e.target.value }))}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Term</label>
                  <select className="input" value={feeForm.term} onChange={e => setFeeForm(f => ({ ...f, term: e.target.value }))}>
                    {["Term 1", "Term 2", "Term 3", "Annual"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="label">Year</label><input className="input" value={feeForm.academicYear} onChange={e => setFeeForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2025" /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowFeeModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : "Add Fee Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Paystack Online Payment Modal ───────────────────── */}
      {showPaystackModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pay Online</h2>
                <p className="text-xs text-gray-400 mt-0.5">Powered by Paystack — card & mobile money</p>
              </div>
              <button onClick={() => setShowPaystackModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePayOnline} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Secure Online Payment</p>
                  <p className="text-xs text-emerald-600 mt-0.5">You&apos;ll be redirected to Paystack to complete your payment via card, mobile money, or bank transfer.</p>
                </div>
              </div>
              <div><label className="label">Fee Item</label>
                <select className="input" value={paystackForm.feeItemId} onChange={e => {
                  const item = feeItems.find(f => f.id === e.target.value)
                  setPaystackForm(f => ({ ...f, feeItemId: e.target.value, amount: item ? String(item.amount) : "" }))
                }}>
                  <option value="">— Select fee to pay —</option>
                  {feeItems.map(f => <option key={f.id} value={f.id}>{f.title} ({formatCurrency(f.amount)})</option>)}
                </select>
              </div>
              <div><label className="label">Amount (GHS) *</label>
                <input className="input" type="number" min="0" step="0.01" required value={paystackForm.amount} onChange={e => setPaystackForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPaystackModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={paystackLoading} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {paystackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  {paystackLoading ? "Loading…" : "Proceed to Pay"}
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
        @media print { header, nav, aside, button { display: none !important; } main { padding: 0 !important; } }
      `}</style>
    </div>
  )
}
