"use client"

import {
  Users, BookOpen, GraduationCap, ClipboardCheck,
  FileText, DollarSign, Library, BedDouble,
  Bus, Package, Bell, MessageSquare,
  Calendar, Lightbulb, Shield, Smartphone,
  Banknote, UserCheck, BarChart3, LogOut,
} from "lucide-react"

const FEATURES = [
  { icon: Users,         title: "Student Management",    desc: "Profiles, enrollment, roll numbers & class promotions",        bg: "from-indigo-500 to-indigo-700" },
  { icon: GraduationCap, title: "Teacher Management",    desc: "Staff profiles, qualifications & subject assignments",          bg: "from-violet-500 to-violet-700" },
  { icon: ClipboardCheck,title: "Attendance Tracking",   desc: "Daily student & staff attendance with % reports",               bg: "from-sky-500 to-sky-700" },
  { icon: FileText,      title: "Examinations",          desc: "Exams, marks entry, result sheets & date sheets",               bg: "from-purple-500 to-purple-700" },
  { icon: DollarSign,    title: "Finance & Fees",        desc: "Fee collection, income tracking & Paystack payments",           bg: "from-amber-500 to-amber-700" },
  { icon: Banknote,      title: "Salary & Payroll",      desc: "Staff salaries, deductions & custom printable payslips",        bg: "from-emerald-500 to-emerald-700" },
  { icon: BookOpen,      title: "Classes & Timetable",   desc: "Sections, subjects & weekly teacher timetables",                bg: "from-pink-500 to-pink-700" },
  { icon: Library,       title: "Library System",        desc: "Book catalog, issue/return tracking & overdue fines",           bg: "from-teal-500 to-teal-700" },
  { icon: BedDouble,     title: "Dormitory",             desc: "Hostels, rooms & bed allocations for students & staff",         bg: "from-orange-500 to-orange-700" },
  { icon: Bus,           title: "Transport",             desc: "Bus routes, vehicle info & driver assignments",                 bg: "from-cyan-500 to-cyan-700" },
  { icon: Package,       title: "Inventory",             desc: "Stock management, low-stock alerts & supplier tracking",        bg: "from-lime-500 to-lime-700" },
  { icon: Bell,          title: "Notice Board",          desc: "Instant announcements for all roles in real time",              bg: "from-rose-500 to-rose-700" },
  { icon: MessageSquare, title: "Messaging",             desc: "Internal inbox — message individuals or entire classes",        bg: "from-fuchsia-500 to-fuchsia-700" },
  { icon: Calendar,      title: "Calendar & Events",     desc: "School events with per-role visibility & color coding",         bg: "from-indigo-600 to-blue-700" },
  { icon: LogOut,        title: "Leave Management",      desc: "Apply, approve & track staff leave with email workflow",        bg: "from-emerald-600 to-teal-700" },
  { icon: Lightbulb,     title: "Suggestion Box",        desc: "Anonymous & named feedback from staff, students & parents",     bg: "from-yellow-500 to-orange-600" },
  { icon: UserCheck,     title: "Parent Portal",         desc: "Linked parent accounts to view grades, fees & attendance",      bg: "from-sky-600 to-indigo-700" },
  { icon: BarChart3,     title: "Reports & Analytics",   desc: "Merit lists, fee summaries & class-wise attendance reports",    bg: "from-violet-600 to-purple-800" },
  { icon: Shield,        title: "Role-Based Access",     desc: "Admin, Headmaster, Teacher, Student, Parent & more",           bg: "from-gray-600 to-gray-800" },
  { icon: Smartphone,    title: "Mobile Money",          desc: "Accept fees via MTN MoMo, AirtelTigo & card payments",         bg: "from-green-500 to-green-700" },
]

// Split into two rows, second row reversed for opposite scroll
const ROW1 = FEATURES.slice(0, 10)
const ROW2 = FEATURES.slice(10)

function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  const Icon = feature.icon
  return (
    <div className={`relative flex-shrink-0 w-56 h-64 rounded-2xl bg-gradient-to-br ${feature.bg} p-5 flex flex-col justify-between overflow-hidden mx-3 shadow-2xl`}>
      <div className="absolute inset-0 opacity-20 bg-white rounded-2xl" />
      <div className="relative">
        <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-sm border border-white/10">
          <Icon className="w-8 h-8 text-white" strokeWidth={1.75} />
        </div>
      </div>
      <div className="relative">
        <h3 className="font-bold text-white text-sm leading-snug mb-1">{feature.title}</h3>
        <p className="text-white/70 text-xs leading-relaxed">{feature.desc}</p>
      </div>
    </div>
  )
}

function MarqueeRow({ items, reverse = false }: { items: typeof FEATURES; reverse?: boolean }) {
  // Duplicate for seamless loop
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden">
      <div
        className={`flex ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`}
        style={{ width: "max-content" }}
      >
        {doubled.map((f, i) => (
          <FeatureCard key={`${f.title}-${i}`} feature={f} />
        ))}
      </div>
    </div>
  )
}

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[#0a0a1f] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-14">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
          Single Stop Solution
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight break-words">
          Comprehensive Features<br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            for Every School Need
          </span>
        </h2>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          20 powerful modules — from student enrollment to salary payslips,
          exams to parent portals. Everything your school needs, in one place.
        </p>
      </div>

      <div className="space-y-4">
        <MarqueeRow items={ROW1} />
        <MarqueeRow items={ROW2} reverse />
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee { animation: marquee 60s linear infinite; }
        .animate-marquee-reverse { animation: marquee-reverse 60s linear infinite; }
      `}</style>
    </section>
  )
}
