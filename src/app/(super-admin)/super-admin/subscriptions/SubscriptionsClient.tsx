"use client"

import { useState } from "react"
import { CheckCircle2, AlertCircle, Clock, DollarSign, Loader2 } from "lucide-react"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

type EnrichedSchool = {
  id: string; name: string; slug: string; plan: string; isActive: boolean
  createdAt: string | Date; subscriptionPaidAt: string | Date | null; subscriptionNotes: string | null
  studentCount: number; amountDue: number; isPaid: boolean; isOverdue: boolean
}

export default function SubscriptionsClient({ schools, feePerStudent }: { schools: EnrichedSchool[]; feePerStudent: number }) {
  const [filter, setFilter] = useState<"ALL" | "PAID" | "OWING" | "TRIAL">("ALL")
  const [marking, setMarking] = useState<string | null>(null)

  const totalExpected = schools.filter(s => s.plan !== "FREE").reduce((sum, s) => sum + s.amountDue, 0)
  const totalPaid = schools.filter(s => s.isPaid).reduce((sum, s) => sum + s.amountDue, 0)
  const totalOwing = totalExpected - totalPaid

  const filtered = schools.filter(s => {
    if (filter === "PAID") return s.isPaid
    if (filter === "OWING") return s.isOverdue
    if (filter === "TRIAL") return s.plan === "FREE"
    return true
  })

  async function markPaid(school: EnrichedSchool) {
    setMarking(school.id)
    try {
      const res = await fetch(`/api/super-admin/schools/${school.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionPaidAt: new Date().toISOString() }),
      })
      if (res.ok) window.location.reload()
    } finally { setMarking(null) }
  }

  const TABS: { label: string; value: typeof filter }[] = [
    { label: "All Schools", value: "ALL" },
    { label: "Paid", value: "PAID" },
    { label: "Owing", value: "OWING" },
    { label: "Free Trial", value: "TRIAL" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">Track school fee payments — GH₵{feePerStudent} per student per term</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Expected", value: formatCurrency(totalExpected), icon: DollarSign, color: "bg-indigo-50 text-indigo-600", sub: `${schools.filter(s => s.plan !== "FREE").length} paid schools` },
          { label: "Collected", value: formatCurrency(totalPaid), icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600", sub: `${schools.filter(s => s.isPaid).length} schools paid` },
          { label: "Outstanding", value: formatCurrency(totalOwing), icon: AlertCircle, color: "bg-red-50 text-red-600", sub: `${schools.filter(s => s.isOverdue).length} overdue` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)} className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors",
            filter === t.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">School</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Students</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Plan</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount Due</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Last Paid</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">No schools match this filter.</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{s.slug}</p>
                  {s.subscriptionNotes && <p className="text-xs text-gray-400 mt-0.5 italic">{s.subscriptionNotes}</p>}
                </td>
                <td className="px-4 py-3 text-center font-bold text-gray-800">{s.studentCount}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                    s.plan === "FREE" ? "bg-gray-100 text-gray-600"
                    : s.plan === "PRO" ? "bg-indigo-50 text-indigo-700"
                    : s.plan === "ENTERPRISE" ? "bg-purple-50 text-purple-700"
                    : "bg-blue-50 text-blue-700")}>
                    {s.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-800">
                  {s.plan === "FREE" ? <span className="text-gray-400 text-xs">On Trial</span> : formatCurrency(s.amountDue)}
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {s.subscriptionPaidAt ? formatDate(s.subscriptionPaidAt) : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {s.plan === "FREE" ? (
                    <span className="flex items-center justify-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" /> Trial
                    </span>
                  ) : s.isPaid ? (
                    <span className="flex items-center justify-center gap-1 text-xs text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1 text-xs text-red-500 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" /> Overdue
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {!s.isPaid && s.plan !== "FREE" && (
                    <button
                      onClick={() => markPaid(s)}
                      disabled={marking === s.id}
                      className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full hover:bg-emerald-100 disabled:opacity-60 flex items-center gap-1 mx-auto"
                    >
                      {marking === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
