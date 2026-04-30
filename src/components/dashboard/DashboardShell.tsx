"use client"

import { useState } from "react"
import Sidebar from "./Sidebar"
import Header from "./Header"

interface Notice { id: string; title: string; content: string; priority: string; createdAt: string | Date }

interface DashboardShellProps {
  children: React.ReactNode
  userName?: string
  schoolName?: string
  role?: string
  notices?: Notice[]
}

export default function DashboardShell({ children, userName, schoolName, role, notices = [] }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} role={role} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          schoolName={schoolName}
          userName={userName}
          role={role}
          notices={notices}
          onMenuToggle={() => setMobileOpen(o => !o)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
