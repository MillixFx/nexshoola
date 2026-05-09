"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users, CheckCircle2, Clock, XCircle, QrCode, Printer,
  Monitor, Loader2, Plus, Trash2, Bell, Settings, RefreshCw,
  ChevronLeft, ChevronRight, Download,
} from "lucide-react"
import { cn } from "@/lib/utils"

type StaffRecord = {
  userId: string; name: string; phone: string | null
  role: string; staffType: string
  record: { status: string; checkInTime: string | null; note: string | null } | null
}

type Board = {
  date: string; lateAfter: string
  board: StaffRecord[]
  summary: { total: number; present: number; late: number; absent: number; onLeave: number }
}

type KioskDevice = { id: string; name: string; isActive: boolean; createdAt: string }
type QrStaff = { id: string; name: string; staffType: string; designation: string; qrDataUrl: string }

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700",
  LATE:    "bg-amber-100 text-amber-700",
  ABSENT:  "bg-red-100 text-red-600",
  LEAVE:   "bg-blue-100 text-blue-700",
}
const STATUS_ICON: Record<string, any> = {
  PRESENT: CheckCircle2,
  LATE:    Clock,
  ABSENT:  XCircle,
  LEAVE:   Clock,
}

export default function StaffAttendanceClient({
  currentUserId, currentUserRole, schoolId,
}: {
  currentUserId: string; currentUserRole: string; schoolId: string
}) {
  const isAdmin = ["ADMIN","HEADMASTER","SUPER_ADMIN"].includes(currentUserRole)

  const [tab, setTab]           = useState<"board"|"kiosk"|"qr">("board")
  const [board, setBoard]       = useState<Board | null>(null)
  const [loading, setLoading]   = useState(true)
  const [date, setDate]         = useState(new Date().toISOString().slice(0,10))

  // Kiosk
  const [devices, setDevices]       = useState<KioskDevice[]>([])
  const [newDeviceName, setNewDeviceName] = useState("")
  const [newToken, setNewToken]     = useState<string | null>(null)
  const [kioskLoading, setKioskLoading] = useState(false)

  // Settings
  const [lateAfter, setLateAfter]   = useState("08:00")
  const [savingTime, setSavingTime] = useState(false)

  // QR codes
  const [qrStaff, setQrStaff]       = useState<QrStaff[]>([])
  const [qrLoading, setQrLoading]   = useState(false)

  // Notify absent
  const [notifying, setNotifying]   = useState(false)
  const [notifyResult, setNotifyResult] = useState("")

  const loadBoard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/staff-attendance?date=${date}`)
      const data = await res.json()
      setBoard(data)
      setLateAfter(data.lateAfter ?? "08:00")
    } finally { setLoading(false) }
  }, [date])

  useEffect(() => { if (tab === "board") loadBoard() }, [tab, loadBoard])

  async function loadDevices() {
    const res = await fetch("/api/staff-attendance/kiosk")
    setDevices(await res.json())
  }

  async function loadQr() {
    setQrLoading(true)
    try {
      const res = await fetch("/api/staff-attendance?mode=qr")
      setQrStaff(await res.json())
    } finally { setQrLoading(false) }
  }

  useEffect(() => {
    if (tab === "kiosk") loadDevices()
    if (tab === "qr")    loadQr()
  }, [tab])

  async function registerDevice() {
    if (!newDeviceName.trim()) return
    setKioskLoading(true)
    const res = await fetch("/api/staff-attendance/kiosk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDeviceName }),
    })
    const data = await res.json()
    setNewToken(data.deviceToken)
    setNewDeviceName("")
    await loadDevices()
    setKioskLoading(false)
  }

  async function deleteDevice(id: string) {
    await fetch(`/api/staff-attendance/kiosk?id=${id}`, { method: "DELETE" })
    await loadDevices()
  }

  async function saveLateAfter() {
    setSavingTime(true)
    await fetch("/api/staff-attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lateAfter }),
    })
    setSavingTime(false)
  }

  async function manualOverride(userId: string, status: string) {
    await fetch("/api/staff-attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date, status }),
    })
    await loadBoard()
  }

  async function notifyAbsent() {
    setNotifying(true); setNotifyResult("")
    const res = await fetch("/api/staff-attendance/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    })
    const data = await res.json()
    setNotifyResult(`SMS sent to ${data.sent} of ${data.total} absent staff`)
    setNotifying(false)
  }

  function printQr() { window.print() }

  function shiftDate(days: number) {
    const d = new Date(date); d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0,10))
  }

  const statusOf = (s: StaffRecord) => s.record?.status ?? "ABSENT"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Staff Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">QR-based kiosk check-in for all teaching and non-teaching staff</p>
        </div>
        <a
          href="/kiosk"
          target="_blank"
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700"
        >
          <Monitor className="w-4 h-4" /> Open Kiosk
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {[
          { key: "board", label: "Live Board", icon: Users },
          { key: "kiosk", label: "Kiosk Devices", icon: Monitor },
          { key: "qr",    label: "QR Badges",   icon: QrCode },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              tab === key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── BOARD TAB ──────────────────────────────────────────────────────── */}
      {tab === "board" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-1 py-1">
              <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-sm border-0 outline-none bg-transparent px-2 text-gray-900 dark:text-white"
              />
              <button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button onClick={loadBoard} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>

            {isAdmin && (
              <>
                {/* Late cutoff */}
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">Late after:</span>
                  <input
                    type="time"
                    value={lateAfter}
                    onChange={e => setLateAfter(e.target.value)}
                    className="text-sm border-0 outline-none bg-transparent text-gray-900 dark:text-white w-24"
                  />
                  <button onClick={saveLateAfter} disabled={savingTime}
                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                    {savingTime ? "…" : "Save"}
                  </button>
                </div>

                <button
                  onClick={notifyAbsent}
                  disabled={notifying}
                  className="flex items-center gap-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-xl disabled:opacity-60"
                >
                  {notifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                  Notify Absent
                </button>
              </>
            )}
          </div>

          {notifyResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm text-emerald-700">
              {notifyResult}
            </div>
          )}

          {/* Summary cards */}
          {board && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Present", value: board.summary.present, color: "emerald" },
                { label: "Late",    value: board.summary.late,    color: "amber"   },
                { label: "Absent",  value: board.summary.absent,  color: "red"     },
                { label: "On Leave",value: board.summary.onLeave, color: "blue"    },
              ].map(s => (
                <div key={s.label} className={cn(
                  "rounded-2xl border-2 p-4 text-center",
                  s.color === "emerald" && "border-emerald-200 bg-emerald-50",
                  s.color === "amber"   && "border-amber-200 bg-amber-50",
                  s.color === "red"     && "border-red-200 bg-red-50",
                  s.color === "blue"    && "border-blue-200 bg-blue-50",
                )}>
                  <p className={cn("text-3xl font-extrabold",
                    s.color === "emerald" && "text-emerald-700",
                    s.color === "amber"   && "text-amber-700",
                    s.color === "red"     && "text-red-600",
                    s.color === "blue"    && "text-blue-700",
                  )}>{s.value}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Staff list */}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">Check-In</th>
                    {isAdmin && <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Override</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {board?.board.map(s => {
                    const st = statusOf(s)
                    const Icon = STATUS_ICON[st] ?? XCircle
                    return (
                      <tr key={s.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-gray-500 capitalize">{s.staffType.toLowerCase()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full", STATUS_COLOR[st])}>
                            <Icon className="w-3 h-3" />
                            {st === "ABSENT" && !s.record ? "Absent" : st}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">
                          {s.record?.checkInTime
                            ? new Date(s.record.checkInTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <select
                              value={st}
                              onChange={e => manualOverride(s.userId, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                            >
                              <option value="PRESENT">Present</option>
                              <option value="LATE">Late</option>
                              <option value="ABSENT">Absent</option>
                              <option value="LEAVE">Leave</option>
                            </select>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {board?.board.length === 0 && (
                <p className="text-center py-8 text-gray-400 text-sm">No staff found</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── KIOSK DEVICES TAB ──────────────────────────────────────────────── */}
      {tab === "kiosk" && (
        <div className="space-y-5 max-w-xl">
          <p className="text-sm text-gray-500">
            Register a tablet or phone as your school's attendance kiosk. Open <strong>/kiosk</strong> on that device and paste the token shown below.
          </p>

          {isAdmin && (
            <div className="flex gap-3">
              <input
                value={newDeviceName}
                onChange={e => setNewDeviceName(e.target.value)}
                placeholder="Device name (e.g. Main Gate Tablet)"
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 dark:text-white"
              />
              <button
                onClick={registerDevice}
                disabled={kioskLoading || !newDeviceName.trim()}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-60"
              >
                {kioskLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Register
              </button>
            </div>
          )}

          {/* New token reveal */}
          {newToken && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4">
              <p className="text-sm font-bold text-emerald-800 mb-2">✅ Device registered! Copy this token now — it won't be shown again.</p>
              <code className="block bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-800 break-all select-all">
                {newToken}
              </code>
              <p className="text-xs text-emerald-600 mt-2">
                Open <strong>nexschoola.vercel.app/kiosk</strong> on the device, paste this token, and tap Activate.
              </p>
              <button onClick={() => setNewToken(null)} className="mt-3 text-xs text-emerald-700 underline">
                I've copied it — dismiss
              </button>
            </div>
          )}

          {/* Device list */}
          <div className="space-y-2">
            {devices.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.isActive ? "Active" : "Inactive"} · Added {new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteDevice(d.id)}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                    title="Deactivate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {devices.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No devices registered yet</p>
            )}
          </div>
        </div>
      )}

      {/* ── QR BADGES TAB ──────────────────────────────────────────────────── */}
      {tab === "qr" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between print:hidden">
            <p className="text-sm text-gray-500">Each staff member's permanent QR badge. Print and laminate for their ID card.</p>
            <button onClick={printQr} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700">
              <Printer className="w-4 h-4" /> Print All Badges
            </button>
          </div>

          {qrLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4">
              {qrStaff.map(s => (
                <div key={s.id} className="bg-white border-2 border-gray-200 rounded-2xl p-4 text-center print:border print:rounded-none print:break-inside-avoid">
                  <img src={s.qrDataUrl} alt={s.name} className="w-32 h-32 mx-auto" />
                  <p className="font-bold text-gray-900 text-sm mt-2 leading-tight">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{s.staffType.toLowerCase()}</p>
                  {s.designation && <p className="text-xs text-gray-400">{s.designation}</p>}
                </div>
              ))}
              {qrStaff.length === 0 && (
                <p className="col-span-full text-center py-8 text-gray-400 text-sm">No active staff found</p>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @media print {
          header, nav, aside, .print\\:hidden { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
