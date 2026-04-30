"use client"

import { useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"

interface DashboardShellProps {
  children: React.ReactNode
  userName?: string
  schoolName?: string
  role?: string
}

export default function DashboardShell({ children, userName, schoolName, role }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        role={role}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          schoolName={schoolName}
          userName={userName}
          role={role}
          onMenuToggle={() => setMobileOpen(o => !o)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
