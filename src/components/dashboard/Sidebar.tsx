"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardCheck, FileText, DollarSign, Library,
  BedDouble, Bus, Package, Bell,
  MessageSquare, MessagesSquare, Calendar, LogOut as LeaveIcon, Send,
  Lightbulb, Settings, ChevronLeft, ChevronDown,
  GraduationCap as Logo, UserCheck, X, Banknote,
  BarChart3, ShieldCheck, ExternalLink, CalendarDays, LayoutGrid, NotebookPen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

// ─── Role type covers all Prisma roles ───────────────────────────────────────
type Role =
  | "ADMIN" | "HEADMASTER"
  | "TEACHER" | "ACCOUNTANT" | "LIBRARIAN"
  | "HOSTEL_MANAGER" | "HR" | "DRIVER"
  | "STUDENT" | "PARENT"

// ─── Role groups ─────────────────────────────────────────────────────────────
const ALL:       Role[] = ["ADMIN","HEADMASTER","TEACHER","ACCOUNTANT","LIBRARIAN","HOSTEL_MANAGER","HR","DRIVER","STUDENT","PARENT"]
const ALL_STAFF: Role[] = ["ADMIN","HEADMASTER","TEACHER","ACCOUNTANT","LIBRARIAN","HOSTEL_MANAGER","HR","DRIVER"]
const MGMT:      Role[] = ["ADMIN","HEADMASTER"]
const ACADEMIC:  Role[] = ["ADMIN","HEADMASTER","TEACHER"]

interface NavItem    { label: string; href: string; icon: React.ElementType; roles: Role[] }
interface NavSection { title: string; icon: React.ElementType; items: NavItem[] }

const NAV: NavSection[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    title: "People",
    icon: Users,
    items: [
      { label: "Students",         href: "/dashboard/students", icon: Users,
        roles: ["ADMIN","HEADMASTER","TEACHER","PARENT","LIBRARIAN","HOSTEL_MANAGER"] },
      { label: "Teachers & Staff", href: "/dashboard/teachers", icon: GraduationCap,
        roles: ["ADMIN","HEADMASTER","HR"] },
      { label: "Parents",          href: "/dashboard/parents",  icon: UserCheck, roles: MGMT },
    ],
  },
  {
    title: "Academic",
    icon: BookOpen,
    items: [
      { label: "Classes",      href: "/dashboard/classes",      icon: BookOpen,       roles: ACADEMIC },
      { label: "Subjects",     href: "/dashboard/subjects",     icon: BookOpen,       roles: ACADEMIC },
      { label: "Timetable",    href: "/dashboard/timetable",    icon: CalendarDays,   roles: [...ACADEMIC, "STUDENT", "PARENT"] as Role[] },
      { label: "Attendance",   href: "/dashboard/attendance",   icon: ClipboardCheck, roles: ACADEMIC },
      { label: "Grade Book",   href: "/dashboard/marks",        icon: NotebookPen,    roles: ACADEMIC },
      { label: "Examinations", href: "/dashboard/examinations", icon: FileText,
        roles: ["ADMIN","HEADMASTER","TEACHER","STUDENT"] },
      { label: "Report Cards", href: "/dashboard/report-cards", icon: BarChart3,      roles: MGMT },
    ],
  },
  {
    title: "My Portal",
    icon: LayoutGrid,
    items: [
      { label: "My Portal", href: "/dashboard/portal", icon: LayoutGrid, roles: ["STUDENT", "PARENT"] },
    ],
  },
  {
    title: "Finance",
    icon: DollarSign,
    items: [
      { label: "Fee & Payments", href: "/dashboard/finance", icon: DollarSign,
        roles: ["ADMIN","HEADMASTER","ACCOUNTANT","PARENT"] },
      { label: "Payroll",        href: "/dashboard/payroll", icon: Banknote,
        roles: ["ADMIN","HEADMASTER","ACCOUNTANT","HR"] },
      { label: "Inventory",      href: "/dashboard/inventory", icon: Package,
        roles: ["ADMIN","HEADMASTER","ACCOUNTANT"] },
    ],
  },
  {
    title: "Resources",
    icon: Library,
    items: [
      { label: "Library",   href: "/dashboard/library",   icon: Library,   roles: ALL },
      { label: "Dormitory", href: "/dashboard/dormitory", icon: BedDouble,
        roles: ["ADMIN","HEADMASTER","HOSTEL_MANAGER"] },
      { label: "Transport", href: "/dashboard/transport", icon: Bus,
        roles: ["ADMIN","HEADMASTER","DRIVER"] },
    ],
  },
  {
    title: "Communication",
    icon: MessagesSquare,
    items: [
      { label: "Notice Board",  href: "/dashboard/notice",        icon: Bell,           roles: ALL },
      { label: "Chat",          href: "/dashboard/chat",          icon: MessagesSquare, roles: ALL },
      { label: "Messages",      href: "/dashboard/messages",      icon: MessageSquare,  roles: ALL },
      { label: "SMS Broadcast", href: "/dashboard/notifications", icon: Send,           roles: MGMT },
      { label: "Calendar",      href: "/dashboard/calendar",      icon: Calendar,       roles: ALL },
    ],
  },
  {
    title: "HR & Admin",
    icon: Settings,
    items: [
      { label: "Leave",       href: "/dashboard/leave",       icon: LeaveIcon,  roles: ALL_STAFF },
      { label: "Suggestions", href: "/dashboard/suggestions", icon: Lightbulb,  roles: ALL },
      { label: "Reports",     href: "/dashboard/reports",     icon: BarChart3,
        roles: ["ADMIN","HEADMASTER","ACCOUNTANT","HR"] },
      { label: "Subscription", href: "/dashboard/subscription", icon: ShieldCheck, roles: ["ADMIN"] },
      { label: "Settings",    href: "/dashboard/settings",    icon: Settings,   roles: MGMT },
    ],
  },
]

// ─── Single accordion group ───────────────────────────────────────────────────
function NavGroup({
  section, pathname, collapsed, role, defaultOpen, onLinkClick,
}: {
  section: NavSection
  pathname: string
  collapsed: boolean
  role: Role
  defaultOpen: boolean
  onLinkClick?: () => void
}) {
  const visible = section.items.filter(i => i.roles.includes(role))
  if (!visible.length) return null

  const hasActive = visible.some(item =>
    item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
  )

  const [open, setOpen] = useState(defaultOpen || hasActive)

  // Re-open group when it becomes active (e.g. navigating)
  useEffect(() => { if (hasActive) setOpen(true) }, [hasActive])

  const GroupIcon = section.icon

  // Collapsed desktop: show only icon pills with tooltip
  if (collapsed) {
    return (
      <div className="space-y-0.5 mb-1">
        {visible.map(item => {
          const Icon = item.icon
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={onLinkClick}
              className={cn(
                "flex justify-center p-2.5 rounded-xl transition-all",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mb-1">
      {/* Section header — only show toggle if more than 1 item visible, or if it's a standalone item */}
      {visible.length === 1 && section.title === "Overview" ? (
        // Dashboard single link — no accordion needed
        <Link
          href={visible[0].href}
          onClick={onLinkClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full",
            hasActive
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <LayoutDashboard className={cn("w-4 h-4 shrink-0", hasActive && "text-indigo-600")} />
          <span>Dashboard</span>
          {hasActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
        </Link>
      ) : visible.length === 1 && section.title === "My Portal" ? (
        // My Portal single link
        <Link
          href={visible[0].href}
          onClick={onLinkClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full",
            hasActive
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <LayoutGrid className={cn("w-4 h-4 shrink-0", hasActive && "text-indigo-600")} />
          <span>My Portal</span>
          {hasActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
        </Link>
      ) : (
        <>
          {/* Accordion toggle header */}
          <button
            onClick={() => setOpen(o => !o)}
            className={cn(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
              hasActive
                ? "text-indigo-600"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            )}
          >
            <GroupIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">{section.title}</span>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              open ? "rotate-0" : "-rotate-90"
            )} />
          </button>

          {/* Animated items */}
          <div className={cn(
            "overflow-hidden transition-all duration-200 ease-in-out",
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}>
            <ul className="space-y-0.5 pt-0.5 pl-3">
              {visible.map(item => {
                const Icon = item.icon
                const isActive = item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onLinkClick}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive && "text-indigo-600")} />
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────
interface SidebarProps { mobileOpen?: boolean; onMobileClose?: () => void; role?: string }

const VALID_ROLES = new Set<string>(["ADMIN","HEADMASTER","TEACHER","ACCOUNTANT","LIBRARIAN","HOSTEL_MANAGER","HR","DRIVER","STUDENT","PARENT"])

function NavList({ pathname, collapsed, role, onLinkClick }: {
  pathname: string; collapsed: boolean; role: Role; onLinkClick?: () => void
}) {
  return (
    <div className="space-y-0.5">
      {NAV.map(section => (
        <NavGroup
          key={section.title}
          section={section}
          pathname={pathname}
          collapsed={collapsed}
          role={role}
          defaultOpen={["Overview", "Academic", "People"].includes(section.title)}
          onLinkClick={onLinkClick}
        />
      ))}
    </div>
  )
}

export default function Sidebar({ mobileOpen = false, onMobileClose, role = "ADMIN" }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const userRole: Role = VALID_ROLES.has(role) ? (role as Role) : "ADMIN"

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />
      )}

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onMobileClose}>
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Logo className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900">Nex<span className="text-indigo-600">Schoola</span></span>
          </Link>
          <button onClick={onMobileClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          <NavList pathname={pathname} collapsed={false} role={userRole} onLinkClick={onMobileClose} />
        </nav>
        <div className="shrink-0 px-3 py-3 border-t border-gray-100">
          <Link href="/" onClick={onMobileClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
            <ExternalLink className="w-4 h-4 shrink-0" /><span>Back to Site</span>
          </Link>
        </div>
      </aside>

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-white border-r border-gray-100 shadow-sm transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}>
        {/* Logo row */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 shrink-0">
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Logo className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-gray-900">Nex<span className="text-indigo-600">Schoola</span></span>
            </Link>
          ) : (
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
          <NavList pathname={pathname} collapsed={collapsed} role={userRole} />
        </nav>

        {/* Footer */}
        <div className={cn("shrink-0 border-t border-gray-100 px-2 py-3", collapsed && "flex justify-center")}>
          <Link href="/" title="Back to Site"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors",
              collapsed && "justify-center px-2"
            )}>
            <ExternalLink className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Back to Site</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
