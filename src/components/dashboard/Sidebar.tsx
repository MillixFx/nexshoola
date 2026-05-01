"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardCheck, FileText, DollarSign, Library,
  BedDouble, Bus, Package, Bell,
  MessageSquare, Calendar, LogOut as LeaveIcon,
  Lightbulb, Settings, ChevronLeft,
  GraduationCap as Logo, UserCheck, X, Banknote,
  BarChart3, ShieldCheck, ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

type Role = "ADMIN" | "HEADMASTER" | "TEACHER" | "STUDENT" | "PARENT"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: Role[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const ALL_ROLES: Role[] = ["ADMIN", "HEADMASTER", "TEACHER", "STUDENT", "PARENT"]
const ADMIN_ONLY: Role[] = ["ADMIN", "HEADMASTER"]
const STAFF: Role[] = ["ADMIN", "HEADMASTER", "TEACHER"]
const GENERAL: Role[] = ["ADMIN", "HEADMASTER", "TEACHER", "STUDENT", "PARENT"]

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Students",  href: "/dashboard/students",  icon: Users,         roles: ["ADMIN", "HEADMASTER", "TEACHER", "PARENT"] },
      { label: "Teachers",  href: "/dashboard/teachers",  icon: GraduationCap, roles: ADMIN_ONLY },
      { label: "Parents",   href: "/dashboard/parents",   icon: UserCheck,     roles: ADMIN_ONLY },
    ],
  },
  {
    title: "Academic",
    items: [
      { label: "Classes",      href: "/dashboard/classes",      icon: BookOpen,      roles: STAFF },
      { label: "Subjects",     href: "/dashboard/subjects",     icon: BookOpen,      roles: STAFF },
      { label: "Attendance",   href: "/dashboard/attendance",   icon: ClipboardCheck,roles: ALL_ROLES },
      { label: "Examinations", href: "/dashboard/examinations", icon: FileText,      roles: ["ADMIN", "HEADMASTER", "TEACHER", "STUDENT"] },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Finance",    href: "/dashboard/finance",    icon: DollarSign, roles: ["ADMIN", "HEADMASTER", "PARENT"] },
      { label: "Payroll",    href: "/dashboard/payroll",    icon: Banknote,   roles: ["ADMIN", "HEADMASTER", "TEACHER"] },
      { label: "Library",    href: "/dashboard/library",    icon: Library,    roles: ALL_ROLES },
      { label: "Dormitory",  href: "/dashboard/dormitory",  icon: BedDouble,  roles: ADMIN_ONLY },
      { label: "Transport",  href: "/dashboard/transport",  icon: Bus,        roles: ADMIN_ONLY },
      { label: "Inventory",  href: "/dashboard/inventory",  icon: Package,    roles: ADMIN_ONLY },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Notice Board", href: "/dashboard/notice",      icon: Bell,         roles: GENERAL },
      { label: "Messages",     href: "/dashboard/messages",    icon: MessageSquare,roles: GENERAL },
      { label: "Leave",        href: "/dashboard/leave",       icon: LeaveIcon,    roles: STAFF },
      { label: "Suggestions",  href: "/dashboard/suggestions", icon: Lightbulb,    roles: GENERAL },
      { label: "Calendar",     href: "/dashboard/calendar",    icon: Calendar,     roles: GENERAL },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Reports",      href: "/dashboard/reports",      icon: BarChart3,   roles: ADMIN_ONLY },
      { label: "Subscription", href: "/dashboard/subscription", icon: ShieldCheck, roles: ["ADMIN"] as Role[] },
      { label: "Settings",     href: "/dashboard/settings",     icon: Settings,    roles: ADMIN_ONLY },
    ],
  },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
  role?: string
}

function NavList({
  pathname,
  collapsed,
  role,
  onLinkClick,
}: {
  pathname: string
  collapsed: boolean
  role: Role
  onLinkClick?: () => void
}) {
  return (
    <div className="space-y-4">
      {NAV_SECTIONS.map((section) => {
        const visibleItems = section.items.filter((item) => item.roles.includes(role))
        if (visibleItems.length === 0) return null

        return (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {visibleItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href || pathname.startsWith(item.href + "/")

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onLinkClick}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        collapsed && "justify-center"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-indigo-600")} />
                      {!collapsed && <span>{item.label}</span>}
                      {isActive && !collapsed && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export default function Sidebar({ mobileOpen = false, onMobileClose, role = "ADMIN" }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const userRole = (role as Role) in { ADMIN: 1, HEADMASTER: 1, TEACHER: 1, STUDENT: 1, PARENT: 1 }
    ? (role as Role)
    : "ADMIN"

  return (
    <>
      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onMobileClose}>
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Logo className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900">
              Nex<span className="text-indigo-600">Schoola</span>
            </span>
          </Link>
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <NavList pathname={pathname} collapsed={false} role={userRole} onLinkClick={onMobileClose} />
        </nav>
        {/* Back to Site */}
        <div className="shrink-0 px-3 py-3 border-t border-gray-100">
          <Link
            href="/"
            onClick={onMobileClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>Back to Site</span>
          </Link>
        </div>
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-white border-r border-gray-100 shadow-sm transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Logo className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-gray-900">
                Nex<span className="text-indigo-600">Schoola</span>
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto">
              <Logo className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors",
              collapsed && "mx-auto mt-1"
            )}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <NavList pathname={pathname} collapsed={collapsed} role={userRole} />
        </nav>
        {/* Back to Site */}
        <div className={cn("shrink-0 border-t border-gray-100 px-2 py-3", collapsed && "flex justify-center")}>
          <Link
            href="/"
            title="Back to Site"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors",
              collapsed && "justify-center px-2"
            )}
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Back to Site</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
