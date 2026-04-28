import Link from "next/link"
import { ArrowRight, GraduationCap } from "lucide-react"

export default function CTA() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-3xl p-12 sm:p-16 overflow-hidden shadow-2xl shadow-indigo-200">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
              Ready to transform{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
                your school?
              </span>
            </h2>
            <p className="text-indigo-200 text-lg max-w-xl mx-auto mb-10">
              Join hundreds of Ghanaian schools already using NexSchoola. Start free today —
              no credit card, no complex setup.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-full hover:bg-indigo-50 transition-all shadow-xl"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 text-white border border-white/30 font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-all"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
