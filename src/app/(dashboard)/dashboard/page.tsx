import { Users, GraduationCap, DollarSign, ClipboardCheck, TrendingUp, Bell, Calendar, BookOpen } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const stats = [
  { label: "Total Students", value: "1,248", change: "+12 this term", icon: Users, color: "bg-indigo-50 text-indigo-600", trend: "up" },
  { label: "Total Teachers", value: "86", change: "+3 this term", icon: GraduationCap, color: "bg-emerald-50 text-emerald-600", trend: "up" },
  { label: "Fees Collected", value: "GH₵ 48,500", change: "82% of target", icon: DollarSign, color: "bg-amber-50 text-amber-600", trend: "up" },
  { label: "Attendance Today", value: "94.2%", change: "+1.2% vs yesterday", icon: ClipboardCheck, color: "bg-sky-50 text-sky-600", trend: "up" },
]

const recentActivity = [
  { action: "New student enrolled", name: "Abena Owusu", class: "JHS 2A", time: "10 min ago" },
  { action: "Fee payment received", name: "Kwame Asante Jr.", amount: "GH₵ 850", time: "25 min ago" },
  { action: "Exam results published", name: "End of Term 1 Results", class: "All Classes", time: "1 hour ago" },
  { action: "Leave approved", name: "Mr. Kofi Boateng", duration: "3 days", time: "2 hours ago" },
  { action: "New notice posted", name: "Parent-Teacher Meeting", date: "Dec 15", time: "3 hours ago" },
]

const upcomingEvents = [
  { title: "Parent-Teacher Meeting", date: "Dec 15", type: "Event" },
  { title: "Term 2 Exams Begin", date: "Dec 20", type: "Exam" },
  { title: "School Fees Deadline", date: "Dec 31", type: "Finance" },
  { title: "Christmas Break", date: "Jan 1", type: "Holiday" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, Akosua. Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">{stat.change}</p>
            </div>
          )
        })}
      </div>

      {/* Content grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Recent Activity</h2>
            <button className="text-xs text-indigo-600 font-medium hover:underline">View all</button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{item.action}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.name} {(item as any).class && `• ${(item as any).class}`}
                    {(item as any).amount && `• ${(item as any).amount}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Upcoming</h2>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="text-center bg-indigo-600 text-white rounded-lg px-2 py-1 min-w-[40px]">
                  <p className="text-xs font-bold leading-tight">{event.date.split(" ")[1]}</p>
                  <p className="text-xs opacity-80">{event.date.split(" ")[0]}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{event.title}</p>
                  <span className="text-xs text-indigo-600 font-medium">{event.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
