import Link from "next/link"
import { CheckCircle2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    desc: "Perfect for small schools just getting started.",
    features: [
      "Up to 100 students",
      "Basic student & teacher management",
      "Attendance tracking",
      "Notice board",
      "1 admin account",
    ],
    cta: "Get Started Free",
    href: "/register",
    highlight: false,
  },
  {
    name: "Basic",
    price: "150",
    period: "per term",
    desc: "For growing schools that need the full suite.",
    features: [
      "Up to 500 students",
      "All 19 modules included",
      "Exam & result management",
      "Fee collection via Paystack",
      "Mobile Money support",
      "Library management",
      "Up to 5 admin accounts",
      "Email support",
    ],
    cta: "Start Free Trial",
    href: "/register?plan=basic",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Pro",
    price: "280",
    period: "per term",
    desc: "For large schools and multi-branch institutions.",
    features: [
      "Unlimited students",
      "All Basic features",
      "Dormitory management",
      "Transport management",
      "Inventory & stock",
      "Salary management",
      "Unlimited admin accounts",
      "Priority support",
      "Custom domain",
    ],
    cta: "Start Free Trial",
    href: "/register?plan=pro",
    highlight: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5">
            Affordable for every school
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Priced in Ghanaian Cedis. No hidden fees. Pay by card or Mobile Money via Paystack.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-2xl p-8 flex flex-col border transition-all duration-300",
                plan.highlight
                  ? "bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-200 scale-105"
                  : "bg-white border-gray-200 hover:shadow-xl hover:shadow-gray-100"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                    <Zap className="w-3 h-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={cn("text-lg font-bold mb-1", plan.highlight ? "text-white" : "text-gray-900")}>
                  {plan.name}
                </h3>
                <p className={cn("text-sm mb-4", plan.highlight ? "text-indigo-200" : "text-gray-500")}>
                  {plan.desc}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-xs font-medium", plan.highlight ? "text-indigo-200" : "text-gray-500")}>
                    GH₵
                  </span>
                  <span className={cn("text-5xl font-extrabold", plan.highlight ? "text-white" : "text-gray-900")}>
                    {plan.price}
                  </span>
                  <span className={cn("text-sm", plan.highlight ? "text-indigo-200" : "text-gray-500")}>
                    /{plan.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className={cn(
                        "w-4 h-4 mt-0.5 shrink-0",
                        plan.highlight ? "text-emerald-300" : "text-emerald-500"
                      )}
                    />
                    <span className={cn("text-sm", plan.highlight ? "text-indigo-100" : "text-gray-600")}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={cn(
                  "block text-center font-bold py-3.5 px-6 rounded-full text-sm transition-all",
                  plan.highlight
                    ? "bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          All plans include a 14-day free trial. No credit card required. Payments powered by{" "}
          <span className="font-semibold text-gray-600">Paystack 🇬🇭</span>
        </p>
      </div>
    </section>
  )
}
