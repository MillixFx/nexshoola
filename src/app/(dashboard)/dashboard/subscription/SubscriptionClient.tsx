"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, AlertTriangle, XCircle, Users, CreditCard, Calendar, Loader2, ExternalLink, ShieldCheck, Clock } from "lucide-react"
import { formatDate, cn } from "@/lib/utils"

type School = {
  id: string; name: string; plan: string
  planExpiry: string | null; subscriptionPaidAt: string | null
  subscriptionNotes: string | null; paystackRef: string | null
}

interface Props {
  school: School
  studentCount: number
  feePerStudent: number
  totalOwed: number
  currency: string
  isActive: boolean
  daysLeft: number
  userEmail: string
}

const PLAN_COLOR: Record<string, string> = {
  FREE:       "bg-gray-100 text-gray-700",
  BASIC:      "bg-blue-50 text-blue-700",
  PRO:        "bg-indigo-50 text-indigo-700",
  ENTERPRISE: "bg-purple-50 text-purple-700",
}

export default function SubscriptionClient({
  school, studentCount, feePerStudent, totalOwed, currency, isActive, daysLeft, userEmail,
}: Props) {
  const searchParams = useSearchParams()
  const justPaid = searchParams.get("success") === "paid"

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Status helpers
  const statusColor = isActive
    ? daysLeft <= 14 ? "amber" : "emerald"
    : "red"

  const statusLabel = isActive
    ? daysLeft <= 14 ? "Expiring Soon" : "Active"
    : school.subscriptionPaidAt ? "Expired" : "Not Subscribed"

  const StatusIcon = isActive
    ? daysLeft <= 14 ? AlertTriangle : CheckCircle2
    : XCircle

  async function handlePayNow() {
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(totalOwed * 100), // pesewas
          type: "SUBSCRIPTION",
          metadata: {
            schoolId: school.id,
            studentCount,
            feePerStudent,
            currentPlan: school.plan,
            email: userEmail,
            description: `NexSchoola subscription — ${studentCount} students × GH₵${feePerStudent}`,
          },
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        throw new Error("No payment URL returned")
      }
    } catch (err: any) {
      setError(err.message || "Payment initialization failed")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Platform Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your NexSchoola subscription. GH₵{feePerStudent} per student per term.
        </p>
      </div>

      {/* Success banner */}
      {justPaid && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Payment confirmed!</p>
            <p className="text-xs text-emerald-600">Your subscription has been renewed for one term (90 days).</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Status card */}
      <div className={cn(
        "rounded-2xl border-2 p-6",
        statusColor === "emerald" && "border-emerald-200 bg-emerald-50",
        statusColor === "amber" && "border-amber-200 bg-amber-50",
        statusColor === "red" && "border-red-200 bg-red-50",
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={cn(
              "w-8 h-8",
              statusColor === "emerald" && "text-emerald-600",
              statusColor === "amber" && "text-amber-600",
              statusColor === "red" && "text-red-500",
            )} />
            <div>
              <p className={cn(
                "text-lg font-bold",
                statusColor === "emerald" && "text-emerald-800",
                statusColor === "amber" && "text-amber-800",
                statusColor === "red" && "text-red-700",
              )}>
                {statusLabel}
              </p>
              {isActive && school.planExpiry && (
                <p className={cn(
                  "text-sm",
                  statusColor === "emerald" ? "text-emerald-600" : "text-amber-600",
                )}>
                  Expires {formatDate(school.planExpiry)} · {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
                </p>
              )}
              {!isActive && (
                <p className="text-sm text-red-600">
                  {school.subscriptionPaidAt
                    ? `Expired on ${formatDate(school.planExpiry ?? school.subscriptionPaidAt)}`
                    : "No active subscription — pay now to unlock all features"}
                </p>
              )}
            </div>
          </div>
          <span className={cn("text-xs font-bold px-3 py-1 rounded-full", PLAN_COLOR[school.plan] ?? "bg-gray-100 text-gray-600")}>
            {school.plan}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Active Students</p>
            <p className="text-2xl font-extrabold text-gray-900">{studentCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Rate per Student</p>
            <p className="text-2xl font-extrabold text-gray-900">GH₵{feePerStudent}</p>
            <p className="text-xs text-gray-400">per term</p>
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border shadow-sm p-5 flex items-center gap-4",
          isActive ? "bg-white border-gray-100" : "bg-red-50 border-red-200"
        )}>
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            isActive ? "bg-emerald-50" : "bg-red-100"
          )}>
            <ShieldCheck className={cn("w-5 h-5", isActive ? "text-emerald-600" : "text-red-500")} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Amount This Term</p>
            <p className={cn("text-2xl font-extrabold", isActive ? "text-gray-900" : "text-red-700")}>
              GH₵{totalOwed.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">{studentCount} × GH₵{feePerStudent}</p>
          </div>
        </div>
      </div>

      {/* Payment info box */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-gray-900">How It Works</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
            <p>You pay <strong>GH₵{feePerStudent} per active student</strong> each term to keep NexSchoola running for your school.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
            <p>Payment is made securely via Paystack — card, mobile money, or bank transfer.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
            <p>Your subscription renews for <strong>90 days (one term)</strong> immediately after payment is confirmed.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</div>
            <p>This fee is <strong>separate from school fees</strong> — school fees paid by students go directly to your school's bank account.</p>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {school.subscriptionPaidAt && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">Last Payment</h2>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{formatDate(school.subscriptionPaidAt)}</p>
              {school.subscriptionNotes && (
                <p className="text-xs text-gray-400 font-mono mt-0.5">{school.subscriptionNotes}</p>
              )}
            </div>
            {school.planExpiry && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Expires</p>
                <p className="text-sm font-semibold text-gray-700">{formatDate(school.planExpiry)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pay Now CTA */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">
              {isActive ? "Renew Subscription" : "Subscribe Now"}
            </h2>
            <p className="text-indigo-200 text-sm mt-1">
              {studentCount} students × GH₵{feePerStudent} = <strong className="text-white">GH₵{totalOwed.toFixed(2)}</strong> for one term
            </p>
            {!isActive && (
              <div className="flex items-center gap-1.5 mt-2">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <p className="text-amber-200 text-xs font-medium">
                  Features are restricted until you subscribe
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handlePayNow}
            disabled={loading}
            className="shrink-0 flex items-center gap-2 bg-white text-indigo-700 font-bold text-sm px-5 py-3 rounded-xl hover:bg-indigo-50 disabled:opacity-60 transition-colors shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            {loading ? "Loading…" : `Pay GH₵${totalOwed.toFixed(2)}`}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>
    </div>
  )
}
