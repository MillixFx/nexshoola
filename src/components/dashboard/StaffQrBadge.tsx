"use client"

import { useEffect, useState } from "react"
import { QrCode, Download, Printer, Loader2 } from "lucide-react"

type QrData = { name: string; schoolName: string; qrDataUrl: string }

export default function StaffQrBadge() {
  const [data, setData]       = useState<QrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState("")

  useEffect(() => {
    fetch("/api/staff-attendance/my-qr")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError("Failed to load QR code"))
      .finally(() => setLoading(false))
  }, [])

  function handleDownload() {
    if (!data) return
    const a = document.createElement("a")
    a.href = data.qrDataUrl
    a.download = `${data.name.replace(/\s+/g, "_")}_attendance_qr.png`
    a.click()
  }

  function handlePrint() {
    if (!data) return
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Badge – ${data.name}</title>
          <style>
            body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
            .badge { text-align: center; border: 2px solid #e0e7ff; border-radius: 16px; padding: 24px 32px; width: 260px; }
            .school { font-size: 11px; color: #6366f1; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
            img { width: 200px; height: 200px; display: block; margin: 0 auto 12px; }
            .name { font-size: 16px; font-weight: 800; color: #1e1b4b; margin-bottom: 4px; }
            .label { font-size: 10px; color: #94a3b8; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="badge">
            <div class="school">${data.schoolName}</div>
            <img src="${data.qrDataUrl}" alt="QR Code" />
            <div class="name">${data.name}</div>
            <div class="label">Staff Attendance Badge · Scan at entrance</div>
          </div>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
          <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-sm">My Attendance Badge</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">Scan at the entrance kiosk to check in</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 text-center py-4">{error}</p>
      )}

      {data && (
        <div className="flex flex-col items-center gap-3">
          {/* Badge card */}
          <div className="border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl p-4 flex flex-col items-center gap-2 bg-indigo-50/40 dark:bg-indigo-900/10 w-full max-w-[220px]">
            <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest text-center">
              {data.schoolName}
            </p>
            <img
              src={data.qrDataUrl}
              alt="My QR code"
              className="w-40 h-40 rounded-lg"
              draggable={false}
            />
            <p className="text-sm font-extrabold text-gray-900 dark:text-white text-center leading-tight">
              {data.name}
            </p>
            <p className="text-[10px] text-gray-400 text-center">Staff Attendance Badge</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl py-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl py-2 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
