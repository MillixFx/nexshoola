"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardCheck, FileText, DollarSign, Library,
  BedDouble, Bus, Package, Bell,
  MessageSquare, Calendar, LogOut as Leave,
  Lightbulb, Settings, ChevronLeft, GraduationCap as Logo,
  UserCheck, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { label: "Dashboard",   href: "/dashboard",             icon: LayoutDashboard },
  { label: "Students",    href: "/dashboard/students",    icon: Users },
  { label: "Teachers",    href: "/dashboard/teachers",    icon: GraduationCap },
  { label: "Parents",     href: "/dashboard/parents",     icon: UserCheck },
  { label: "Classes",     href: "/dashboard/classes",     icon: BookOpen },
  { label: "Subjects",    href: "/dashboard/subjects",    icon: BookOpen },
  { label: "Attendance",  href: "/dashboard/attendance",  icon: ClipboardCheck },
  { label: "Examinations",href: "/dashboard/examinations",icon: FileText },
  { label: "Finance",     href: "/dashboard/finance",     icon: DollarSign },
  { label: "Library",     href: "/dashboard/library",     icon: Library },
  { label: "Dormitory",   href: "/dashboard/dormitory",   icon: BedDouble },
  { label: "Transport",   href: "/dashboard/transport",   icon: Bus },
  { label: "Inventory",   href: "/dashboard/inventory",   icon: Package },
  { label: "Notice Board",href: "/dashboard/notice",      icon: Bell },
  { label: "Messages",    href: "/dashboard/messages",    icon: MessageSquare },
  { label: "Leave",       href: "/dashboard/leave",       icon: Leave },
  { label: "Suggestions", href: "/dashboard/suggestions", icon: Lightbulb },
  { label: "Calendar",    href: "/dashboard/calendar",    icon: Calendar },
  { label: "Settings",    href: "/dashboard/settings",    icon: Settings },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

function NavList({ pathname, collapsed, onLinkClick }: { pathname: string; collapsed: boolean; onLinkClick?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
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
  )
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

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
          <NavList pathname={pathname} collapsed={false} onLinkClick={onMobileClose} />
        </nav>
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
          <NavList pathname={pathname} collapsed={collapsed} />
        </nav>
      </aside>
    </>
  )
}
