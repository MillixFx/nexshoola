"use client"

import Link from "next/link"
import { CheckCircle2, Zap, Building2, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const STUDENTS = [50, 100, 200, 300, 500, 800, 1000]
const RATE = 15 // GH₵ per student per term

const standardFeatures = [
  "All 19 modules included",
  "Unlimited students",
  "Attendance & exam management",
  "Fee collection via Paystack",
  "Mobile Money support",
  "Library & dormitory management",
  "Transport & inventory tracking",
  "Up to 3 admin accounts",
  "Email support",
]

const whitelabelFeatures = [
  "Everything in Standard",
  "Custom domain (e.g. portal.yourschool.com)",
  "School logo & brand colours",
  "Branded login page & emails",
  "Remove NexSchoola branding",
  "Up to 10 admin accounts",
  "WhatsApp & priority support",
  "Dedicated onboarding call",
]

export default function Pricing() {
  const [students, setStudents] = useState(200)
  const termCost = students * RATE

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
            Pay only for the students you have. No flat fees, no surprises.
            Priced in Ghana Cedis, billed per term.
          </p>
        </div>

        {/* 1-month free trial banner */}
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

        {/* Price calculator */}
        <div className="bg-indigo-600 rounded-2xl p-8 mb-12 text-white">
          <div className="max-w-2xl mx-auto">
            <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-1">Pricing Calculator</p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-2xl font-extrabold">
                GH₵15 × <span className="text-emerald-300">{students} students</span>
              </h3>
              <div className="text-right">
                <p className="text-4xl font-extrabold">GH₵{termCost.toLocaleString()}</p>
                <p className="text-indigo-300 text-sm">per term</p>
              </div>
            </div>
            <input
              type="range"
              min={50}
              max={1000}
              step={10}
              value={students}
              onChange={e => setStudents(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-indigo-300 mt-1">
              <span>50 students</span>
              <span>500</span>
              <span>1,000 students</span>
            </div>
            <p className="text-indigo-200 text-xs mt-4 text-center">
              Drag the slider to see your school's exact cost · Billed at the start of each term
            </p>
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
              <p className="text-sm text-gray-500 mb-4">Everything your school needs, all in one place.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-gray-500">GH₵</span>
                <span className="text-6xl font-extrabold text-gray-900">15</span>
                <div className="ml-1">
                  <p className="text-sm text-gray-500 leading-tight">per student</p>
                  <p className="text-sm text-gray-500 leading-tight">per term</p>
                </div>
              </div>
              <p className="text-xs text-indigo-600 font-semibold mt-2">
                e.g. 200 students = GH₵3,000/term
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {standardFeatures.map((f) => (
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

          {/* White Label Plan */}
          <div className="relative rounded-2xl p-8 flex flex-col border border-indigo-100 bg-gray-50 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300">
            <div className="absolute -top-3 left-6">
              <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Building2 className="w-3 h-3" /> White Label
              </span>
            </div>
            <div className="mb-6 pt-2">
              <h3 className="text-xl font-extrabold text-gray-900 mb-1">Branded Portal</h3>
              <p className="text-sm text-gray-500 mb-4">Your school's own branded management system.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-gray-500">GH₵</span>
                <span className="text-6xl font-extrabold text-gray-900">15</span>
                <div className="ml-1">
                  <p className="text-sm text-gray-500 leading-tight">per student</p>
                  <p className="text-sm text-gray-500 leading-tight">per term</p>
                </div>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-bold text-amber-700">+ GH₵799 one-time setup fee</span>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Covers domain config, SSL, branding & onboarding
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {whitelabelFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                  <span className="text-sm text-gray-600">{f}</span>
                </li>
              ))}
            </ul>

            <a
              href="mailto:hello@nexschoola.com?subject=White Label Enquiry"
              className="flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-full text-sm bg-gray-900 text-white hover:bg-gray-800 transition-all"
            >
              <Mail className="w-4 h-4" />
              Contact Sales
            </a>
            <p className="text-center text-xs text-gray-400 mt-3">
              We'll set everything up within 48 hours
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
