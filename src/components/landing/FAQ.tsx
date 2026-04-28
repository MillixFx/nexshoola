"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free plan requires no credit card. For paid plans, you can pay via Paystack using Mobile Money (MTN, AirtelTigo, Vodafone Cash) or card.",
  },
  {
    q: "Can I use NexSchoola for multiple school branches?",
    a: "Yes! Each branch gets its own subdomain (e.g. branch1.nexschoola.com). The Pro plan supports unlimited students and multiple admin accounts to manage branches.",
  },
  {
    q: "How does Mobile Money payment work for parents?",
    a: "Parents receive a payment link for fees. They pay via MTN MoMo, AirtelTigo, Vodafone Cash, or card — all powered by Paystack. The payment is recorded automatically.",
  },
  {
    q: "Is student data secure?",
    a: "Absolutely. Each school's data is completely isolated from others. We use encrypted connections, secure authentication, and regular backups.",
  },
  {
    q: "Can students and parents access the system?",
    a: "Yes. Students can view their results, attendance, timetable, and fees. Parents can view their child's academic records and receive messages from teachers.",
  },
  {
    q: "What languages is NexSchoola available in?",
    a: "Currently English. We plan to add Twi and other Ghanaian languages based on demand.",
  },
  {
    q: "How long does setup take?",
    a: "Most schools are fully set up within a day. Sign up, configure your school settings, import your students and teachers, and you're ready to go.",
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Frequently asked questions
          </h2>
          <p className="text-gray-500">Can&apos;t find the answer? Contact us at hello@nexschoola.com</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm"
            >
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-gray-900 text-sm">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200",
                    open === i && "rotate-180"
                  )}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-50">
                  <p className="pt-3">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
