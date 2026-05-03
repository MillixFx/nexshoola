"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  CheckCircle2, AlertTriangle, XCircle, CreditCard, Calendar,
  Loader2, ExternalLink, Clock, Zap, Crown, Sparkles, Mail, Phone,
} from "lucide-react"
import { formatDate, cn } from "@/lib/utils"

type School = {
  id: string; name: string; plan: string
  planExpiry: string | null; subscriptionPaidAt: string | null
  subscriptionNotes: string | null; paystackRef: string | null
}

interface Props {
  school: School
  planPrices: { BASIC: number; PRO: number }
  currency: string
  isActive: boolean
  daysLeft: number
  userEmail: string
  supportEmail: string
}

// ─── Plan metadata ────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: "BASIC" as const,
    label: "Basic",
    icon: Zap,
    accent: "blue",
    borderClass: "border-blue-200",
    badgeClass: "bg-blue-100 text-blue-700",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    features: [
      "Up to 500 students",
      "Student & class management",
      "Attendance tracking",
      "Exams & report cards",
      "HR & payroll",
      "Notice board & calendar",
      "Email support",
    ],
    popular: false,
  },
  {
    key: "PRO" as const,
    label: "Pro",
    icon: Sparkles,
    accent: "indigo",
    borderClass: "border-indigo-400",
    badgeClass: "bg-indigo-100 text-indigo-700",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    features: [
      "Unlimited students",
      "Everything in Basic",
      "Parent portal access",
      "Library borrow & return",
      "Dormitory management",
      "SMS notifications",
      "Priority support",
      "Advanced analytics",
    ],
    popular: true,
  },
  {
    key: "ENTERPRISE" as const,
    label: "Enterprise",
    icon: Crown,
    accent: "purple",
    borderClass: "border-purple-300",
    badgeClass: "bg-purple-100 text-purple-700",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    features: [
      "Everything in Pro",
      "Custom-branded website",
      "Your own domain name",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "On-site training",
      "White-label option",
    ],
    popular: false,
  },
]

const STATUS_BADGE: Record<string, string> = {
  FREE:       "bg-gray-100 text-gray-600",
  BASIC:      "bg-blue-50 text-blue-700",
  PRO:        "bg-indigo-50 text-indigo-700",
  ENTERPRISE: "bg-purple-50 text-purple-700",
}

export default function SubscriptionClient({
  school, planPrices, currency, isActive, daysLeft, userEmail, supportEmail,
}: Props) {
  const searchParams = useSearchParams()
  const justPaid = searchParams.get("success") === "paid"

  const [selected, setSelected] = useState<"BASIC" | "PRO" | "ENTERPRISE">("PRO")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const curr = currency === "GHS" ? "GH₵" : currency

  const statusColor = isActive
    ? daysLeft <= 14 ? "amber" : "emerald"
    : "red"
  const statusLabel = isActive
    ? daysLeft <= 14 ? "Expiring Soon" : "Active"
    : school.subscriptionPaidAt ? "Expired" : "Not Subscribed"
  const StatusIcon = isActive
    ? daysLeft <= 14 ? AlertTriangle : CheckCircle2
    : XCircle

  const selectedPrice = selected === "BASIC" ? planPrices.BASIC : selected === "PRO" ? planPrices.PRO : null

  async function handlePayNow() {
    if (!selectedPrice) return
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(selectedPrice * 100),
          type: "SUBSCRIPTION",
          metadata: {
            schoolId: school.id,
            currentPlan: school.plan,
            selectedPlan: selected,
            email: userEmail,
            description: `NexSchoola ${selected === "BASIC" ? "Basic" : "Pro"} — 1 year`,
            planPrice: selectedPrice,
          },
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      if (data.authorization_url) window.location.href = data.authorization_url
      else throw new Error("No payment URL returned")
    } catch (err: any) {
      setError(err.message || "Payment initialization failed")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Platform Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose a yearly plan for <strong>{school.name}</strong>. All plans billed annually.
        </p>
      </div>

      {/* Banners */}
      {justPaid && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Payment confirmed!</p>
            <p className="text-xs text-emerald-600">Your subscription is now active for 1 year.</p>
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Current status */}
      <div className={cn(
        "rounded-2xl border-2 p-5 flex items-start justify-between gap-3",
        statusColor === "emerald" && "border-emerald-200 bg-emerald-50",
        statusColor === "amber"   && "border-amber-200 bg-amber-50",
        statusColor === "red"     && "border-red-200 bg-red-50",
      )}>
        <div className="flex items-center gap-3">
          <StatusIcon className={cn("w-7 h-7",
            statusColor === "emerald" && "text-emerald-600",
            statusColor === "amber"   && "text-amber-600",
            statusColor === "red"     && "text-red-500",
          )} />
          <div>
            <p className={cn("font-bold",
              statusColor === "emerald" && "text-emerald-800",
              statusColor === "amber"   && "text-amber-800",
              statusColor === "red"     && "text-red-700",
            )}>{statusLabel}</p>
            {isActive && school.planExpiry ? (
              <p className={cn("text-xs", statusColor === "emerald" ? "text-emerald-600" : "text-amber-600")}>
                Expires {formatDate(school.planExpiry)} · {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
              </p>
            ) : (
              <p className="text-xs text-red-600">
                {school.subscriptionPaidAt
                  ? `Expired ${formatDate(school.planExpiry ?? school.subscriptionPaidAt)}`
                  : "No active subscription — choose a plan below"}
              </p>
            )}
          </div>
        </div>
        <span className={cn("text-xs font-bold px-3 py-1 rounded-full shrink-0", STATUS_BADGE[school.plan] ?? "bg-gray-100 text-gray-600")}>
          {school.plan}
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const Icon      = plan.icon
          const isSelected = selected === plan.key
          const isCurrent  = school.plan === plan.key && isActive
          const price      = plan.key === "BASIC" ? planPrices.BASIC : plan.key === "PRO" ? planPrices.PRO : null

          return (
            <button
              key={plan.key}
              onClick={() => setSelected(plan.key)}
              className={cn(
                "relative text-left rounded-2xl border-2 p-5 transition-all focus:outline-none",
                isSelected
                  ? `${plan.borderClass} shadow-lg`
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm",
              )}
            >
              {/* Badges */}
              {plan.popular && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                  Most Popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow">
                  Current Plan
                </span>
              )}

              {/* Icon + name */}
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", plan.iconBg)}>
                <Icon className={cn("w-4 h-4", plan.iconColor)} />
              </div>
              <p className="font-bold text-gray-900 text-base">{plan.label}</p>

              {/* Price */}
              <div className="mt-1 mb-4">
                {price !== null ? (
                  <>
                    <span className="text-2xl font-extrabold text-gray-900">{curr}{price.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-1">/year</span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-purple-700">Custom Pricing</span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Selected indicator */}
              {isSelected && (
                <div className={cn("mt-4 text-xs font-semibold flex items-center gap-1", plan.iconColor)}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Action CTA */}
      {selected === "ENTERPRISE" ? (
        /* Enterprise — contact sales */
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Enterprise — Let's Talk</h2>
              <p className="text-purple-200 text-sm mt-1">
                Get a custom-built website, your own domain, and a dedicated support team. Pricing is tailored to your school's needs.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}?subject=Enterprise Plan Enquiry — ${school.name}&body=Hi, I'm interested in the Enterprise plan for ${school.name}. Please get in touch.`}
                  className="flex items-center justify-center gap-2 bg-white text-purple-700 font-bold text-sm px-5 py-3 rounded-xl hover:bg-purple-50 transition-colors shadow-sm"
                >
                  <Mail className="w-4 h-4" /> Email Sales
                </a>
              )}
              <a
                href={`https://wa.me/?text=Hi, I'm interested in the Enterprise plan for ${encodeURIComponent(school.name)} on NexSchoola.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-purple-500 text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-purple-400 transition-colors"
              >
                <Phone className="w-4 h-4" /> WhatsApp Us
              </a>
            </div>
          </div>
          <p className="text-purple-300 text-xs mt-4">
            Our sales team typically responds within 24 hours. Include your school name and student count for a faster quote.
          </p>
        </div>
      ) : (
        /* Basic / Pro — pay now */
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">
                {isActive ? `Renew ${selected === "BASIC" ? "Basic" : "Pro"}` : `Subscribe — ${selected === "BASIC" ? "Basic" : "Pro"}`}
              </h2>
              <p className="text-indigo-200 text-sm mt-1">
                {curr}{selectedPrice?.toLocaleString()} billed annually · 365 days access
                {isActive && daysLeft > 0 && " · extends from current expiry"}
              </p>
              {!isActive && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <p className="text-amber-200 text-xs font-medium">All features unlock immediately after payment</p>
                </div>
              )}
            </div>
            <button
              onClick={handlePayNow}
              disabled={loading}
              className="shrink-0 flex items-center gap-2 bg-white text-indigo-700 font-bold text-sm px-5 py-3 rounded-xl hover:bg-indigo-50 disabled:opacity-60 transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              {loading ? "Loading…" : `Pay ${curr}${selectedPrice?.toLocaleString()}`}
            </button>
          </div>
        </div>
      )}

      {/* Last payment */}
      {school.subscriptionPaidAt && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" /> Last Payment
          </h2>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{formatDate(school.subscriptionPaidAt)}</p>
              {school.subscriptionNotes && <p className="text-xs text-gray-400 font-mono mt-0.5">{school.subscriptionNotes}</p>}
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

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-3">How It Works</h2>
        <div className="space-y-3 text-sm text-gray-600">
          {[
            "Choose the plan that fits your school. Basic covers core management; Pro adds parent portal, library, and dormitory features.",
            "Pay securely via Paystack — mobile money, card, or bank transfer. No hidden fees.",
            "Your subscription activates immediately for 365 days. Renewing early extends from your current expiry date.",
            "Enterprise schools get a fully custom-branded website and dedicated support — contact our sales team for a tailored quote.",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
