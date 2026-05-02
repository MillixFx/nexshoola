"use client"

/**
 * SessionWatcher
 * ─────────────
 * Detects inactivity for WARN_AFTER_MS (25 min).
 * Shows a modal countdown (5 min) — "Stay logged in" refreshes the session,
 * "Sign out" or timeout auto-signs the user out.
 *
 * Drop anywhere inside a layout that wraps the protected dashboard.
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { signOut } from "next-auth/react"
import { ShieldAlert, LogOut, RefreshCw } from "lucide-react"

const WARN_AFTER_MS  = 25 * 60 * 1000   // 25 minutes of inactivity → show warning
const LOGOUT_AFTER_MS =  5 * 60 * 1000  // 5 more minutes → auto sign-out
const TICK_MS         = 1000             // countdown resolution

// Activity events that reset the inactivity timer
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel",
]

export default function SessionWatcher() {
  const [showWarning, setShowWarning]   = useState(false)
  const [secondsLeft, setSecondsLeft]   = useState(LOGOUT_AFTER_MS / 1000)

  const lastActivityRef = useRef(Date.now())
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Reset activity timer ─────────────────────────────────────────────────

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()

    // If the warning is not yet showing, restart the inactivity timer
    if (!showWarning) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true)
        setSecondsLeft(LOGOUT_AFTER_MS / 1000)
      }, WARN_AFTER_MS)
    }
  }, [showWarning])

  // ── Register activity listeners ──────────────────────────────────────────

  useEffect(() => {
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, resetActivity, { passive: true }))
    // Start first inactivity timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(LOGOUT_AFTER_MS / 1000)
    }, WARN_AFTER_MS)

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, resetActivity))
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Start / stop countdown when warning appears ──────────────────────────

  useEffect(() => {
    if (showWarning) {
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(countdownRef.current!)
            signOut({ callbackUrl: "/login" })
            return 0
          }
          return s - 1
        })
      }, TICK_MS)
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [showWarning])

  // ── Stay logged in ───────────────────────────────────────────────────────

  async function handleStay() {
    // Touch the session endpoint to refresh the JWT
    await fetch("/api/auth/session")
    lastActivityRef.current = Date.now()
    setShowWarning(false)
    // Restart inactivity timer
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(LOGOUT_AFTER_MS / 1000)
    }, WARN_AFTER_MS)
  }

  function handleLogout() {
    signOut({ callbackUrl: "/login" })
  }

  // ── Format countdown ────────────────────────────────────────────────────

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const countdown = `${mins}:${String(secs).padStart(2, "0")}`

  // ── Render warning modal ─────────────────────────────────────────────────

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-amber-500 px-6 py-5 text-white text-center">
          <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-90" />
          <h2 className="text-lg font-extrabold">Session About to Expire</h2>
          <p className="text-sm opacity-80 mt-0.5">You've been inactive for a while</p>
        </div>

        {/* Countdown */}
        <div className="px-6 py-5 text-center">
          <p className="text-sm text-gray-600">
            You will be automatically signed out in
          </p>
          <div className="mt-3 mb-5 inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-amber-400 bg-amber-50">
            <span className="text-2xl font-extrabold text-amber-700 tabular-nums">{countdown}</span>
          </div>
          <p className="text-xs text-gray-400">
            Any unsaved work may be lost. Click <strong>Stay Logged In</strong> to continue your session.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
          <button
            onClick={handleStay}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600"
          >
            <RefreshCw className="w-4 h-4" /> Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}
