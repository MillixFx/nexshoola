import Link from "next/link"
import { ArrowRight, CheckCircle2, Star } from "lucide-react"

const highlights = [
  "19 powerful modules",
  "Multi-school ready",
  "Mobile Money payments",
]

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 pt-16">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M60 0v60M0 60h60' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-white/90">
              Built for Ghanaian Schools 🇬🇭
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            The Modern School{" "}
            <span className="relative">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Management System
              </span>
              <svg
                className="absolute -bottom-2 left-0 right-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 10 C75 2, 225 2, 298 10"
                  stroke="url(#underline-gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="underline-gradient" x1="0" y1="0" x2="300" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </span>{" "}
            for Ghana
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-indigo-200 max-w-2xl mx-auto mb-10 leading-relaxed">
            NexSchoola helps schools manage students, teachers, attendance, exams, fees,
            and more — all in one beautifully simple platform. Accept payments via{" "}
            <span className="text-white font-semibold">MTN Mobile Money</span>,{" "}
            <span className="text-white font-semibold">Vodafone Cash</span> & cards.
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-indigo-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="group flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-full text-base hover:bg-indigo-50 transition-all shadow-2xl shadow-indigo-900/50"
            >
              Start Free — No Credit Card
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 text-white/80 hover:text-white font-medium px-6 py-4 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all text-base"
            >
              See how it works
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex -space-x-2">
              {["bg-indigo-400", "bg-emerald-400", "bg-amber-400", "bg-pink-400", "bg-cyan-400"].map(
                (color, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-full ${color} border-2 border-indigo-900 flex items-center justify-center text-xs font-bold text-white`}
                  >
                    {["A", "K", "E", "B", "N"][i]}
                  </div>
                )
              )}
            </div>
            <div className="text-sm text-indigo-200">
              <div className="flex items-center gap-1 justify-center sm:justify-start">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1 font-semibold text-white">4.9/5</span>
              </div>
              <span>Trusted by schools across Ghana</span>
            </div>
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="mt-20 relative max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
            {/* Browser chrome */}
            <div className="bg-gray-900 px-4 py-3 flex items-center gap-2 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 bg-gray-800 rounded-md h-6 mx-4 flex items-center px-3">
                <span className="text-xs text-gray-400">greenhill.nexschoola.com/dashboard</span>
              </div>
            </div>
            {/* Mock dashboard */}
            <div className="bg-gray-950 p-4 flex gap-3 min-h-[320px]">
              {/* Sidebar */}
              <div className="w-48 bg-gray-900 rounded-xl p-3 hidden lg:flex flex-col gap-1 shrink-0">
                <div className="h-8 bg-indigo-600 rounded-lg mb-3 flex items-center px-2">
                  <div className="w-4 h-4 bg-white/20 rounded" />
                  <div className="ml-2 h-2.5 bg-white/60 rounded flex-1" />
                </div>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-7 bg-gray-800 rounded-lg flex items-center px-2 gap-2">
                    <div className="w-3 h-3 bg-gray-600 rounded" />
                    <div className="h-2 bg-gray-600 rounded flex-1" style={{ width: `${60 + i * 5}%` }} />
                  </div>
                ))}
              </div>
              {/* Main */}
              <div className="flex-1 flex flex-col gap-3">
                {/* Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Students", val: "1,248", color: "bg-indigo-500/20 border-indigo-500/30" },
                    { label: "Teachers", val: "86", color: "bg-emerald-500/20 border-emerald-500/30" },
                    { label: "Fees Due", val: "GH₵ 24k", color: "bg-amber-500/20 border-amber-500/30" },
                    { label: "Attendance", val: "94%", color: "bg-cyan-500/20 border-cyan-500/30" },
                  ].map((stat) => (
                    <div key={stat.label} className={`${stat.color} border rounded-xl p-3`}>
                      <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
                      <div className="text-lg font-bold text-white">{stat.val}</div>
                    </div>
                  ))}
                </div>
                {/* Chart placeholder */}
                <div className="flex-1 bg-gray-900 rounded-xl p-3">
                  <div className="h-3 bg-gray-700 rounded w-32 mb-3" />
                  <div className="flex items-end gap-2 h-28">
                    {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md opacity-80" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow under mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-indigo-500/20 blur-2xl rounded-full" />
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 80 L1440 80 L1440 40 C1200 80 960 0 720 40 C480 80 240 0 0 40 Z" fill="white" />
        </svg>
      </div>
    </section>
  )
}
