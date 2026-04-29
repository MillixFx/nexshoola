"use client"

import { Bell, Search, ChevronDown, Menu, GraduationCap } from "lucide-react"
import { getInitials } from "@/lib/utils"
import Link from "next/link"

interface HeaderProps {
  userName?: string
  schoolName?: string
  role?: string
  onMenuToggle?: () => void
}

export default function Header({
  userName = "Admin User",
  schoolName = "School Name",
  role = "ADMIN",
  onMenuToggle,
}: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
      {/* Left: hamburger (mobile) + logo (mobile) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile logo */}
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900">
            Nex<span className="text-indigo-600">Schoola</span>
          </span>
        </Link>

        {/* Search (desktop) */}
        <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-56">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* School badge (tablet+) */}
        <span className="hidden md:inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {schoolName}
        </span>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(userName)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-800 leading-tight">{userName}</p>
            <p className="text-xs text-gray-400 capitalize">{role.toLowerCase().replace("_", " ")}</p>
          </div>
          <ChevronDown className="hidden sm:block w-4 h-4 text-gray-400" />
        </div>
      </div>
    </header>
  )
}
