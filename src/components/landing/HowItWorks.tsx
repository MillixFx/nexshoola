import { School, Users, Zap } from "lucide-react"

const steps = [
  {
    step: "01",
    icon: School,
    title: "Register Your School",
    desc: "Sign up in minutes. Your school gets its own subdomain (e.g. greenhill.nexschoola.com), logo, and configuration.",
    color: "bg-indigo-600",
  },
  {
    step: "02",
    icon: Users,
    title: "Add Your People",
    desc: "Import or manually add students, teachers, parents, and staff. Assign roles and classes instantly.",
    color: "bg-emerald-600",
  },
  {
    step: "03",
    icon: Zap,
    title: "Run Your School",
    desc: "Take attendance, run exams, collect fees via Mobile Money, and view real-time reports — from any device.",
    color: "bg-amber-500",
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-4">
            Simple setup
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5">
            Up and running in minutes
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            No IT team needed. No complex setup. Just sign up and start managing your school.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-indigo-200 via-emerald-200 to-amber-200" />

          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="relative flex flex-col items-center text-center">
                {/* Step bubble */}
                <div className={`relative z-10 w-20 h-20 ${step.color} rounded-2xl flex flex-col items-center justify-center shadow-xl mb-6`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <span className="absolute top-0 right-6 md:right-8 text-6xl font-black text-gray-100 select-none -z-10">
                  {step.step}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
