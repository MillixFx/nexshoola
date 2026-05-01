import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Building2, Users, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default async function SuperAdminOverview() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/login")

  const [schools, platformConfig] = await Promise.all([
    prisma.school.findMany({
      include: {
        _count: { select: { students: true, teachers: true, users: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.platformConfig.findFirst(),
  ])

  const activeSchools = schools.filter(s => s.isActive)
  const totalStudents = schools.reduce((sum, s) => sum + s._count.students, 0)
  const feePerStudent = platformConfig?.feePerStudentTermly ?? 15
  const expectedRevenue = totalStudents * feePerStudent

  const paidSchools = schools.filter(s => s.subscriptionPaidAt && new Date(s.subscriptionPaidAt) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
  const owingSchools = activeSchools.filter(s => !s.subscriptionPaidAt || new Date(s.subscriptionPaidAt!) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
  const trialSchools = schools.filter(s => s.plan === "FREE")

  const PLAN_COLOR: Record<string, string> = {
    FREE: "bg-gray-100 text-gray-600",
    BASIC: "bg-blue-50 text-blue-700",
    PRO: "bg-indigo-50 text-indigo-700",
    ENTERPRISE: "bg-purple-50 text-purple-700",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor all schools, revenue, and platform health</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Schools", value: schools.length, icon: Building2, color: "bg-indigo-50 text-indigo-600", detail: `${activeSchools.length} active` },
          { label: "Total Students", value: totalStudents.toLocaleString(), icon: Users, color: "bg-blue-50 text-blue-600", detail: "across all schools" },
          { label: "Expected Revenue", value: formatCurrency(expectedRevenue), icon: DollarSign, color: "bg-emerald-50 text-emerald-600", detail: `@ GH₵${feePerStudent}/student/term` },
          { label: "Paid Schools", value: paidSchools.length, icon: TrendingUp, color: "bg-amber-50 text-amber-600", detail: `${owingSchools.length} owing` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.detail}</p>
          </div>
        ))}
      </div>

      {/* Subscription status bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "On Trial (FREE)", count: trialSchools.length, icon: Clock, color: "bg-gray-50 border-gray-200 text-gray-700" },
          { label: "Subscription Paid", count: paidSchools.length, icon: CheckCircle2, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Owing / Overdue", count: owingSchools.filter(s => s.plan !== "FREE").length, icon: AlertCircle, color: "bg-red-50 border-red-200 text-red-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-5 flex items-center gap-4 ${s.color}`}>
            <s.icon className="w-8 h-8 shrink-0 opacity-60" />
            <div>
              <p className="text-3xl font-extrabold">{s.count}</p>
              <p className="text-sm font-semibold">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent schools table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">All Schools</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">School</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Slug</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Students</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Staff</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Subaccount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schools.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">No schools registered yet.</td></tr>
              ) : schools.map(school => (
                <tr key={school.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-semibold text-gray-900">{school.name}</td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{school.slug}</td>
                  <td className="px-4 py-3 text-center text-gray-700 font-medium">{school._count.students}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{school._count.teachers}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLAN_COLOR[school.plan] ?? "bg-gray-100 text-gray-600"}`}>{school.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${school.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {school.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {school.paystackSubaccountCode ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/super-admin/schools?id=${school.id}`}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Manage →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
