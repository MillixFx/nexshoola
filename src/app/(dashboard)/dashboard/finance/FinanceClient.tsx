"use client"

import { useState } from "react"
import { DollarSign, Plus, TrendingUp, TrendingDown, CreditCard, FileText } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

type Transaction = {
  id: string; amount: number; type: string; method: string | null; status: string; reference: string | null; note: string | null; description: string | null; date: string | Date
  student?: { user: { name: string } } | null
  feeItem?: { title: string; amount: number } | null
}
type FeeItem = { id: string; title: string; amount: number; term: string | null; academicYear: string | null; class: { name: string; section: string | null } | null }
type Student = { id: string; user: { name: string } }
type Class = { id: string; name: string; section: string | null }

interface Props { transactions: Transaction[]; feeItems: FeeItem[]; students: Student[]; classes: Class[]; schoolId: string }

const TABS = ["Overview", "Transactions", "Fee Items"] as const

export default function FinanceClient({ transactions: initialTx, feeItems: initialFees, students, classes, schoolId }: Props) {
  const [tab, setTab] = useState<typeof TABS[number]>("Overview")
  const [transactions, setTransactions] = useState(initialTx)
  const [feeItems, setFeeItems] = useState(initialFees)
  const [showPayment, setShowPayment] = useState(false)
  const [showFeeModal, setShowFeeModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [payForm, setPayForm] = useState({ studentId: "", feeItemId: "", amount: "", method: "CASH", reference: "", note: "" })
  const [feeForm, setFeeForm] = useState({ title: "", amount: "", classId: "", term: "Term 1", academicYear: new Date().getFullYear().toString() })

  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0)

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/finance/transaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payForm, schoolId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      const tx = await res.json()
      setTransactions(prev => [tx, ...prev])
      setShowPayment(false)
      setPayForm({ studentId: "", feeItemId: "", amount: "", method: "CASH", reference: "", note: "" })
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleFeeItem(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...feeForm, type: "fee_item", schoolId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      const item = await res.json()
      setFeeItems(prev => [...prev, item])
      setShowFeeModal(false)
      setFeeForm({ title: "", amount: "", classId: "", term: "Term 1", academicYear: new Date().getFullYear().toString() })
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" description="Manage school fees, payments and transactions"
        action={
          <div className="flex gap-2">
            <button onClick={() => { setShowFeeModal(true); setError("") }} className="flex items-center gap-2 border border-indigo-200 text-indigo-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-50">
              <FileText className="w-4 h-4" /> Fee Item
            </button>
            <button onClick={() => { setShowPayment(true); setError("") }} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
              <Plus className="w-4 h-4" /> Record Payment
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Income", value: formatCurrency(totalIncome), icon: TrendingUp, color: "bg-emerald-50 text-emerald-600", bg: "bg-emerald-600" },
          { label: "Total Expenses", value: formatCurrency(totalExpense), icon: TrendingDown, color: "bg-red-50 text-red-600", bg: "bg-red-500" },
          { label: "Net Balance", value: formatCurrency(totalIncome - totalExpense), icon: DollarSign, color: "bg-indigo-50 text-indigo-600", bg: "bg-indigo-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", s.color)}>
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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg", tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center gap-4 py-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", t.type === "INCOME" ? "bg-emerald-50" : "bg-red-50")}>
                    <CreditCard className={cn("w-4 h-4", t.type === "INCOME" ? "text-emerald-600" : "text-red-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{t.feeItem?.title ?? t.description ?? t.note ?? "Payment"}</p>
                    <p className="text-xs text-gray-400">{t.student?.user.name ?? "—"} · {formatDate(t.date)} · {t.method}</p>
                  </div>
                  <span className={cn("text-sm font-bold", t.type === "INCOME" ? "text-emerald-600" : "text-red-500")}>
                    {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Transactions" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No transactions.</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.student?.user.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{t.feeItem?.title ?? t.description ?? t.note ?? "—"}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">{t.method}</span></td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Fee Items" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Term</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {feeItems.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">No fee items yet. Click "Fee Item" to add one.</td></tr>
              ) : feeItems.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{f.title}</td>
                  <td className="px-4 py-3 text-gray-500">{f.class ? `${f.class.name}${f.class.section ? ` ${f.class.section}` : ""}` : "All Classes"}</td>
                  <td className="px-4 py-3 text-gray-500">{f.term ?? "—"} {f.academicYear ? `(${f.academicYear})` : ""}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600">{formatCurrency(f.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
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
              <div><label className="label">Amount (GH₵) *</label><input className="input" type="number" min="0" step="0.01" required value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
              <div><label className="label">Payment Method</label>
                <select className="input" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE", "CARD"].map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                </select>
              </div>
              <div><label className="label">Reference / Receipt No.</label><input className="input" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="RCP-001" /></div>
              <div><label className="label">Note</label><input className="input" value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowPayment(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Record Payment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fee Item Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Fee Item</h2>
              <button onClick={() => setShowFeeModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleFeeItem} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div><label className="label">Title *</label><input className="input" required value={feeForm.title} onChange={e => setFeeForm(f => ({ ...f, title: e.target.value }))} placeholder="School Fees Term 1" /></div>
              <div><label className="label">Amount (GH₵) *</label><input className="input" type="number" min="0" required value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} placeholder="500.00" /></div>
              <div><label className="label">Class (leave blank for all)</label>
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
                <div><label className="label">Academic Year</label><input className="input" value={feeForm.academicYear} onChange={e => setFeeForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2024" /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowFeeModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Add Fee Item"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>
    </div>
  )
}
