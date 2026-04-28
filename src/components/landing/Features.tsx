import {
  Users, BookOpen, GraduationCap, ClipboardCheck,
  FileText, DollarSign, Library, BedDouble,
  Bus, Package, Bell, MessageSquare,
  Calendar, LogOut, Lightbulb, Settings,
  BarChart3, Shield, Smartphone,
} from "lucide-react"

const features = [
  {
    icon: Users,
    title: "Student Management",
    desc: "Full student profiles, photo uploads, class assignments, roll numbers, and promotions.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: GraduationCap,
    title: "Teacher Management",
    desc: "Manage teacher profiles, subject assignments, qualifications, and attendance records.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance Tracking",
    desc: "Daily student, teacher, and employee attendance with percentage reports.",
    color: "bg-sky-50 text-sky-600",
  },
  {
    icon: FileText,
    title: "Examinations",
    desc: "Create exams, schedules, enter marks, generate results, and publish to students/parents.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: DollarSign,
    title: "Finance & Fees",
    desc: "Manage student fees, salary payroll, income/expense tracking — accept Paystack payments.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: BookOpen,
    title: "Class & Timetable",
    desc: "Define classes, sections, subjects, and weekly timetables with teacher assignments.",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: Library,
    title: "Library System",
    desc: "Book catalog, categories, member registration, issue/return tracking with fines.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: BedDouble,
    title: "Dormitory",
    desc: "Manage hostels, rooms, and bed allocations for students and staff.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: Bus,
    title: "Transport",
    desc: "Route management, vehicle assignments, and driver information tracking.",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: Package,
    title: "Inventory",
    desc: "Stock management, vendor tracking, item distribution to students and staff.",
    color: "bg-lime-50 text-lime-600",
  },
  {
    icon: Bell,
    title: "Notice Board",
    desc: "Post school-wide announcements visible to all roles in real time.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: MessageSquare,
    title: "Messaging",
    desc: "Internal messaging system — send to individuals or entire classes.",
    color: "bg-fuchsia-50 text-fuchsia-600",
  },
  {
    icon: Calendar,
    title: "Calendar Events",
    desc: "School event calendar with per-user event management and color coding.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: LogOut,
    title: "Leave Management",
    desc: "Staff leave applications, headmaster approval workflow, and status tracking.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Lightbulb,
    title: "Suggestion Box",
    desc: "Anonymous or named suggestions from staff, students, and parents.",
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    icon: Users,
    title: "Parent Portal",
    desc: "Parent accounts linked to students — view grades, fees, attendance, and messages.",
    color: "bg-sky-50 text-sky-600",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Class-wise result sheets, merit lists, fee summaries, and attendance reports.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "11 user roles: Admin, Headmaster, Teacher, Student, Parent, Accountant, and more.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Smartphone,
    title: "Mobile Money",
    desc: "Accept school fees via MTN MoMo, AirtelTigo, Vodafone Cash, and card payments.",
    color: "bg-green-50 text-green-600",
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-4">
            Everything you need
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5">
            19 Modules. One Platform.
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            From student enrollment to exam results, fee collection to library management —
            NexSchoola covers every corner of your school.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group relative p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-xl hover:shadow-indigo-100/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
