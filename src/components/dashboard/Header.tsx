"use client"

import {
  Bell, Search, ChevronDown, Menu, GraduationCap, LogOut,
  Settings, X, Lock, Check, Eye, EyeOff, Loader2, BookOpen,
} from "lucide-react"
import { getInitials } from "@/lib/utils"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useState, useRef, useEffect, useCallback } from "react"

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

// ── Search result types ───────────────────────────────────────────────────────
interface SearchResults {
  students: { id: string; studentId: string | null; user: { name: string; email: string }; class: { name: string; section: string | null } | null }[]
  teachers: { id: string; teacherId: string | null; designation: string | null; user: { name: string; email: string; role: string } }[]
  parents:  { id: string; user: { name: string; email: string }; relation: string | null }[]
  classes:  { id: string; name: string; section: string | null; _count: { students: number } }[]
}

// ── Password Modal ────────────────────────────────────────────────────────────
function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!open) { setForm({ current: "", next: "", confirm: "" }); setError(null); setDone(false) }
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
      window.addEventListener("keydown", handler)
      return () => window.removeEventListener("keydown", handler)
    }
  }, [open, onClose])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.next !== form.confirm) { setError("New passwords do not match."); return }
    if (form.next.length < 8) { setError("New password must be at least 8 characters."); return }
    setSaving(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to change password."); return }
      setDone(true)
      setTimeout(onClose, 1500)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md mx-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Change Password</h3>
            <p className="text-xs text-gray-400">Update your account password</p>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">Password changed successfully!</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={form.current}
                  onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNext ? "text" : "password"}
                  value={form.next}
                  onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="At least 8 characters"
                />
                <button type="button" onClick={() => setShowNext(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.next && (
                <div className="mt-1.5 flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                      form.next.length > i * 2 + 1
                        ? form.next.length >= 12 ? "bg-emerald-500"
                        : form.next.length >= 8 ? "bg-amber-400"
                        : "bg-red-400"
                        : "bg-gray-200"
                    }`} />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${
                  form.confirm && form.confirm !== form.next ? "border-red-300" : "border-gray-200"
                }`}
                placeholder="Repeat new password"
              />
              {form.confirm && form.confirm !== form.next && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : "Change Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main Header ───────────────────────────────────────────────────────────────
export default function Header({
  userName = "Admin User",
  schoolName = "School Name",
  role = "ADMIN",
  onMenuToggle,
  notices = [],
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Search state
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalResults = results
    ? results.students.length + results.teachers.length + results.parents.length + results.classes.length
    : 0

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setSearchOpen(false); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data: SearchResults = await res.json()
        setResults(data)
        setSearchOpen(true)
      }
    } catch { /* ignore */ } finally {
      setSearching(false)
    }
  }, [])

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(q), 300)
  }

  function clearSearch() {
    setQuery("")
    setResults(null)
    setSearchOpen(false)
  }

  const unread = notices.length

  return (
    <>
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

          {/* Search */}
          <div className="hidden sm:block relative" ref={searchRef}>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-64 focus-within:border-indigo-300 focus-within:bg-white transition-colors">
              {searching
                ? <Loader2 className="w-4 h-4 text-gray-400 shrink-0 animate-spin" />
                : <Search className="w-4 h-4 text-gray-400 shrink-0" />
              }
              <input
                type="text"
                value={query}
                onChange={handleSearchChange}
                onFocus={() => { if (results && totalResults > 0) setSearchOpen(true) }}
                placeholder="Search students, staff…"
                className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full"
              />
              {query && (
                <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results dropdown */}
            {searchOpen && results && totalResults > 0 && (
              <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                {results.students.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Students</p>
                    {results.students.map(s => (
                      <Link key={s.id} href={`/dashboard/students/${s.id}`} onClick={clearSearch}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(s.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{s.user.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {s.class ? `${s.class.name}${s.class.section ? ` ${s.class.section}` : ""}` : "No class"}
                            {s.studentId ? ` · ${s.studentId}` : ""}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {results.teachers.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staff</p>
                    {results.teachers.map(t => (
                      <Link key={t.id} href="/dashboard/teachers" onClick={clearSearch}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(t.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{t.user.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {t.user.role.toLowerCase().replace(/_/g, " ")}
                            {t.designation ? ` · ${t.designation}` : ""}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {results.parents.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parents</p>
                    {results.parents.map(p => (
                      <Link key={p.id} href="/dashboard/parents" onClick={clearSearch}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(p.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{p.user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{p.relation ?? "Parent"} · {p.user.email}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {results.classes.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Classes</p>
                    {results.classes.map(c => (
                      <Link key={c.id} href="/dashboard/classes" onClick={clearSearch}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {c.name}{c.section ? ` ${c.section}` : ""}
                          </p>
                          <p className="text-xs text-gray-400">{c._count.students} students</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <div className="px-4 py-2.5 border-t border-gray-50 text-xs text-gray-400">
                  {totalResults} result{totalResults !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                </div>
              </div>
            )}

            {searchOpen && query.length >= 2 && !searching && results && totalResults === 0 && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl p-4 text-sm text-gray-400 text-center z-50">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}
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
            <button onClick={() => setBellOpen(o => !o)} className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
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

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(o => !o)} className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {getInitials(userName)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{userName}</p>
                <p className="text-xs text-gray-400 capitalize">{role.toLowerCase().replace(/_/g, " ")}</p>
              </div>
              <ChevronDown className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
                  <p className="text-xs text-gray-400 capitalize mt-0.5">{role.toLowerCase().replace(/_/g, " ")}</p>
                </div>
                <div className="py-1.5">
                  <Link href="/dashboard/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings className="w-4 h-4 text-gray-400" /> Settings
                  </Link>
                  <button
                    onClick={() => { setDropdownOpen(false); setPwOpen(true) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Lock className="w-4 h-4 text-gray-400" /> Change Password
                  </button>
                  <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  )
}
