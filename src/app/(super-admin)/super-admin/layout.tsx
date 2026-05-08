"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  GraduationCap, LayoutDashboard, Building2, CreditCard,
  Settings, LogOut, Shield, MessageSquare, Menu, X, Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import ThemeToggle from "@/components/ThemeToggle"

// ── Audio ─────────────────────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!_audioCtx) _audioCtx = new AudioContext()
    return _audioCtx
  } catch { return null }
}
function unlockAudio() {
  const ctx = getAudioCtx()
  if (ctx && ctx.state === "suspended") ctx.resume()
}
function playMessageSound() {
  const ctx = getAudioCtx()
  if (!ctx) return
  const play = () => {
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch { /* ignore */ }
  }
  if (ctx.state === "running") play()
  else ctx.resume().then(play).catch(() => {})
}

const NAV = [
  { href: "/super-admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/super-admin/schools", icon: Building2, label: "Schools" },
  { href: "/super-admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/super-admin/chat", icon: MessageSquare, label: "Messages" },
  { href: "/super-admin/settings", icon: Settings, label: "Platform Settings" },
]

function SidebarContent({ pathname, onLinkClick }: { pathname: string; onLinkClick?: () => void }) {
  return (
    <>
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-gray-800 shrink-0">
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

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/super-admin" ? pathname === "/super-admin" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onLinkClick}
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
    </>
  )
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const [recentMsgs, setRecentMsgs] = useState<{ id: string; senderName: string; preview: string }[]>([])
  const prevChatUnread = useRef(-1)
  const bellRef = useRef<HTMLDivElement>(null)

  // Unlock AudioContext on first interaction
  useEffect(() => {
    document.addEventListener("pointerdown", unlockAudio, { once: true })
    return () => document.removeEventListener("pointerdown", unlockAudio)
  }, [])

  // Close bell dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  // Poll chat unread count every 10 s
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch("/api/chat/conversations")
        if (!res.ok) return
        const convs: {
          id: string
          isGroup: boolean
          name: string | null
          participants: { name: string }[]
          lastMessage: { content: string } | null
          unreadCount: number
        }[] = await res.json()
        const total = convs.reduce((s, c) => s + (c.unreadCount ?? 0), 0)
        if (prevChatUnread.current === -1) {
          prevChatUnread.current = total
        } else if (total > prevChatUnread.current) {
          playMessageSound()
        }
        prevChatUnread.current = total
        setChatUnread(total)
        const withUnread = convs
          .filter(c => (c.unreadCount ?? 0) > 0)
          .slice(0, 5)
          .map(c => ({
            id: c.id,
            senderName: c.name ?? c.participants[0]?.name ?? "Someone",
            preview: c.lastMessage?.content ?? "New message",
          }))
        setRecentMsgs(withUnread)
      } catch { /* ignore */ }
    }
    fetchUnread()
    const t = setInterval(fetchUnread, 10_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent pathname={pathname} onLinkClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-gray-900 border-r border-gray-800 flex-col shrink-0">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl px-3 py-1.5">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Super Admin Console</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Chat icon with unread badge */}
            <Link
              href="/super-admin/chat"
              className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Messages"
            >
              <MessageSquare className="w-5 h-5" />
              {chatUnread > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {chatUnread > 9 ? "9+" : chatUnread}
                </span>
              )}
            </Link>

            {/* Bell with unread-messages popup */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(o => !o)}
                className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {chatUnread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    {chatUnread > 9 ? "9+" : chatUnread}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 top-[4.5rem] sm:top-full sm:mt-2 sm:w-80 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Unread Messages</p>
                    <button onClick={() => setBellOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {recentMsgs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">No new messages</div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                      {recentMsgs.map(m => (
                        <Link
                          key={m.id}
                          href="/super-admin/chat"
                          onClick={() => setBellOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {m.senderName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{m.senderName}</p>
                            <p className="text-xs text-gray-400 truncate">{m.preview}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2.5">
                    <Link
                      href="/super-admin/chat"
                      onClick={() => setBellOpen(false)}
                      className="text-xs text-indigo-500 font-semibold hover:underline"
                    >
                      Go to Messages →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link href="/super-admin" className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">
              ← Overview
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  )
}
