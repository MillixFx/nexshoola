"use client"

import { useState } from "react"
import { CheckCircle2, AlertCircle, Clock, DollarSign, Loader2, Calendar } from "lucide-react"
import { formatCurrency, formatDate, cn } from "@/lib/utils"

type EnrichedSchool = {
  id: string; name: string; slug: string; plan: string; isActive: boolean
  createdAt: string | Date
  subscriptionPaidAt: string | Date | null
  subscriptionNotes: string | null
  planExpiry: string | Date | null
  studentCount: number
  planPrice: number
  isPaid: boolean
  isOverdue: boolean
}

type PlanPrices = { BASIC: number; PRO: number; ENTERPRISE: number }

const PLAN_COLOR: Record<string, string> = {
  FREE:       "bg-gray-100 text-gray-600",
  BASIC:      "bg-blue-50 text-blue-700",
  PRO:        "bg-indigo-50 text-indigo-700",
  ENTERPRISE: "bg-purple-50 text-purple-700",
}

export default function SubscriptionsClient({
  schools, planPrices, currency,
}: { schools: EnrichedSchool[]; planPrices: PlanPrices; currency: string }) {
  const [filter, setFilter] = useState<"ALL" | "PAID" | "OWING" | "TRIAL">("ALL")
  const [marking, setMarking] = useState<string | null>(null)

  const curr = currency === "GHS" ? "GH₵" : currency

  const paidSchools  = schools.filter(s => s.isPaid)
  const owingSchools = schools.filter(s => s.isOverdue)
  const totalCollected  = paidSchools.reduce((sum, s) => sum + s.planPrice, 0)
  const totalOutstanding = owingSchools.reduce((sum, s) => sum + s.planPrice, 0)

  const filtered = schools.filter(s => {
    if (filter === "PAID")  return s.isPaid
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
        body: JSON.stringify({
          subscriptionPaidAt: new Date().toISOString(),
          planExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          plan: school.plan === "FREE" ? "BASIC" : school.plan,
        }),
      })
      if (res.ok) window.location.reload()
    } finally { setMarking(null) }
  }

  const TABS: { label: string; value: typeof filter; count: number }[] = [
    { label: "All Schools", value: "ALL",   count: schools.length },
    { label: "Active",      value: "PAID",  count: paidSchools.length },
    { label: "Owing",       value: "OWING", count: owingSchools.length },
    { label: "Free Trial",  value: "TRIAL", count: schools.filter(s => s.plan === "FREE").length },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track yearly subscriptions — Basic {curr}{planPrices.BASIC.toLocaleString()} · Pro {curr}{planPrices.PRO.toLocaleString()} · Enterprise {curr}{planPrices.ENTERPRISE.toLocaleString()}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Subscriptions", value: paidSchools.length.toString(), icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600", sub: `${curr}${totalCollected.toLocaleString()} collected` },
          { label: "Owing Renewal",        value: owingSchools.length.toString(), icon: AlertCircle, color: "bg-red-50 text-red-600",     sub: `${curr}${totalOutstanding.toLocaleString()} outstanding` },
          { label: "Free Trial",           value: schools.filter(s => s.plan === "FREE").length.toString(), icon: Clock, color: "bg-amber-50 text-amber-600", sub: "Not yet subscribed" },
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
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5",
              filter === t.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              filter === t.value ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600")}>
              {t.count}
            </span>
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
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Annual Fee</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Expires</th>
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
                  {s.subscriptionNotes && <p className="text-xs text-gray-400 mt-0.5 italic truncate max-w-xs">{s.subscriptionNotes}</p>}
                </td>
                <td className="px-4 py-3 text-center font-bold text-gray-800">{s.studentCount}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", PLAN_COLOR[s.plan] ?? "bg-gray-100 text-gray-600")}>
                    {s.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-800">
                  {s.plan === "FREE"
                    ? <span className="text-gray-400 text-xs">Free Trial</span>
                    : <span>{curr}{s.planPrice.toLocaleString()}</span>
                  }
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {s.planExpiry ? (
                    <span className="flex items-center justify-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(s.planExpiry)}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {s.plan === "FREE" ? (
                    <span className="flex items-center justify-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" /> Trial
                    </span>
                  ) : s.isPaid ? (
                    <span className="flex items-center justify-center gap-1 text-xs text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1 text-xs text-red-500 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" /> Overdue
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {s.plan !== "FREE" && !s.isPaid && (
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
