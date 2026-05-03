import Link from "next/link"
import { CheckCircle2, Zap, Building2, Mail } from "lucide-react"
import { prisma } from "@/lib/prisma"

const standardFeatures = [
  "All 19 modules included",
  "Unlimited students",
  "Attendance & exam management",
  "Fee collection via Paystack",
  "Mobile Money support",
  "Library & dormitory management",
  "Transport & inventory tracking",
  "Parent portal access",
  "Up to 3 admin accounts",
  "Email support",
]

const brandedFeatures = [
  "Everything in Standard",
  "Custom domain (e.g. portal.yourschool.com)",
  "School logo & brand colours",
  "Branded login page & emails",
  "Remove NexSchoola branding",
  "Up to 10 admin accounts",
  "WhatsApp & priority support",
  "Dedicated onboarding call",
]

export default async function Pricing() {
  const config = await prisma.platformConfig.findFirst({
    select: { planPriceBasic: true, planPricePro: true, currency: true },
  })

  const standardPrice = config?.planPriceBasic ?? 500
  const brandedPrice  = config?.planPricePro   ?? 1200
  const curr = config?.currency === "GHS" ? "GH₵" : (config?.currency ?? "GH₵")

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Heading */}
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5">
            Simple, honest pricing
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            One flat yearly fee — no per-student charges, no surprises.
            Priced in Ghana Cedis, billed once a year.
          </p>
        </div>

        {/* Free trial banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">1 Month Free Trial — No Credit Card Required</p>
              <p className="text-xs text-gray-500 mt-0.5">Try every feature with your real school data. Cancel anytime.</p>
            </div>
          </div>
          <Link
            href="/register"
            className="shrink-0 bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
          >
            Start Free Trial →
          </Link>
        </div>

        {/* Yearly pricing highlight */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-8 mb-12 text-white text-center">
          <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-2">How Billing Works</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Flat yearly fee · All students included
          </h3>
          <p className="text-indigo-200 text-sm max-w-lg mx-auto">
            Pay once per year and your entire school is covered — 50 students or 5,000 students, same price.
            No per-student counting, no term-by-term invoices.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-6">
            {[
              { label: "Standard", price: `${curr}${standardPrice.toLocaleString()}` },
              { label: "Branded Portal", price: "Custom" },
            ].map(p => (
              <div key={p.label} className="bg-white/10 rounded-2xl px-8 py-4 text-center">
                <p className="text-indigo-200 text-xs font-semibold mb-1">{p.label}</p>
                <p className="text-3xl font-extrabold">{p.price}</p>
                <p className="text-indigo-300 text-xs mt-0.5">per year</p>
              </div>
            ))}
          </div>
        </div>

        {/* Two plan cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* Standard Plan */}
          <div className="relative rounded-2xl p-8 flex flex-col border border-gray-200 bg-white hover:shadow-xl hover:shadow-gray-100 transition-all duration-300">
            <div className="absolute -top-3 left-6">
              <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>

            <div className="mb-6 pt-2">
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">Standard</h3>
              <p className="text-sm text-gray-500 mb-5">Everything your school needs, all in one place.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-medium text-gray-500">{curr}</span>
                <span className="text-5xl font-extrabold text-gray-900">
                  {standardPrice.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">per year · unlimited students</p>
              <p className="text-xs text-indigo-600 font-semibold mt-2 bg-indigo-50 inline-block px-2 py-1 rounded-lg">
                ≈ {curr}{Math.round(standardPrice / 12).toLocaleString()}/month · no per-student charges
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {standardFeatures.map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                  <span className="text-sm text-gray-600">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register?plan=standard"
              className="block text-center font-bold py-3.5 px-6 rounded-full text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
            >
              Start 1 Month Free
            </Link>
          </div>

          {/* Branded Portal */}
          <div className="relative rounded-2xl p-8 flex flex-col border border-gray-800 bg-gray-900 hover:shadow-xl hover:shadow-gray-800/20 transition-all duration-300">
            <div className="absolute -top-3 left-6">
              <span className="bg-gray-800 border border-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Building2 className="w-3 h-3" /> White Label
              </span>
            </div>

            <div className="mb-6 pt-2">
              <h3 className="text-xl font-extrabold text-white mb-1">Branded Portal</h3>
              <p className="text-sm text-gray-400 mb-5">Your school's own branded management system.</p>
              <p className="text-3xl font-extrabold text-white">Custom Pricing</p>
              <p className="text-sm text-gray-400 mt-1">tailored to your school's needs</p>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
                <span className="text-xs font-bold text-amber-400">
                  Includes custom website + your own domain
                </span>
              </div>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {brandedFeatures.map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                  <span className="text-sm text-gray-300">{f}</span>
                </li>
              ))}
            </ul>

            <a
              href="mailto:hello@nexschoola.com?subject=Branded Portal Enquiry"
              className="flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-full text-sm bg-white text-gray-900 hover:bg-gray-100 transition-all"
            >
              <Mail className="w-4 h-4" />
              Contact Sales
            </a>
            <p className="text-center text-xs text-gray-500 mt-3">
              Our team typically responds within 24 hours
            </p>
          </div>
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-gray-400 mt-10">
          1 month free trial on all plans · No credit card required · Cancel anytime ·{" "}
          <span className="font-semibold text-gray-500">Payments powered by Paystack</span>
        </p>
      </div>
    </section>
  )
}
