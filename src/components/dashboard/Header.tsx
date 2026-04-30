"use client"

import { Bell, Search, ChevronDown, Menu, GraduationCap, LogOut, Settings, X } from "lucide-react"
import { getInitials } from "@/lib/utils"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useState, useRef, useEffect } from "react"

interface Notice { id: string; title: string; content: string; priority: string; createdAt: string | Date }

interface HeaderProps {
  userName?: string
  schoolName?: string
  role?: string
  onMenuToggle?: () => void
  notices?: Notice[]
}

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-red-500", HIGH: "bg-amber-500", NORMAL: "bg-blue-500", LOW: "bg-gray-400",
}

export default function Header({
  userName = "Admin User",
  schoolName = "School Name",
  role = "ADMIN",
  onMenuToggle,
  notices = [],
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const unread = notices.length

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900">Nex<span className="text-indigo-600">Schoola</span></span>
        </Link>
        <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-56">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search..." className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full" />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* School badge */}
        <span className="hidden md:inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {schoolName}
        </span>

        {/* Bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(o => !o)}
            className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-900">Notices</p>
                <button onClick={() => setBellOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              {notices.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No notices yet</div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {notices.map(n => (
                    <div key={n.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[n.priority] ?? "bg-gray-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-50 px-4 py-2.5">
                <Link href="/dashboard/notice" onClick={() => setBellOpen(false)} className="text-xs text-indigo-600 font-semibold hover:underline">
                  View all notices →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(o => !o)} className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {getInitials(userName)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{userName}</p>
              <p className="text-xs text-gray-400 capitalize">{role.toLowerCase().replace("_", " ")}</p>
            </div>
            <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{role.toLowerCase().replace("_", " ")}</p>
              </div>
              <div className="py-1.5">
                <Link href="/dashboard/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Settings className="w-4 h-4 text-gray-400" /> Settings
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
