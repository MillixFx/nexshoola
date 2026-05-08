"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { GraduationCap, LayoutDashboard, Building2, CreditCard, Settings, LogOut, Shield, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/super-admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/super-admin/schools", icon: Building2, label: "Schools" },
  { href: "/super-admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/super-admin/chat", icon: MessageSquare, label: "Messages" },
  { href: "/super-admin/settings", icon: Settings, label: "Platform Settings" },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-gray-800">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">NexSchoola</p>
            <p className="text-indigo-400 text-[10px] font-semibold uppercase tracking-wider">Super Admin</p>
          </div>
        </div>

        <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-amber-900/30 rounded-xl border border-amber-700/30 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-xs font-semibold text-amber-300">Platform Owner</p>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/super-admin" ? pathname === "/super-admin" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700">Super Admin Console</span>
          </div>
          <Link href="/super-admin" className="text-xs text-gray-500 hover:text-indigo-600 font-medium">
            ← Overview
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
