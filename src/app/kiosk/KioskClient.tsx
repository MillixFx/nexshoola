"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { CheckCircle2, Clock, AlertCircle, QrCode, Loader2, Shield } from "lucide-react"

const STORAGE_KEY = "nexschoola_kiosk_token"
const SCAN_COOLDOWN = 3000 // ms before next scan accepted

type ScanResult = {
  name: string
  status: "PRESENT" | "LATE" | "ABSENT"
  checkInTime: string
  alreadyRecorded: boolean
  error?: string
}

export default function KioskClient() {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const scannerRef  = useRef<any>(null)
  const lastScanRef = useRef<number>(0)

  const [deviceToken, setDeviceToken]   = useState<string | null>(null)
  const [pinInput, setPinInput]         = useState("")
  const [pinError, setPinError]         = useState("")
  const [scanning, setScanning]         = useState(false)
  const [result, setResult]             = useState<ScanResult | null>(null)
  const [time, setTime]                 = useState(new Date())
  const [cameraError, setCameraError]   = useState("")

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Load stored device token
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setDeviceToken(stored)
  }, [])

  // Start camera when device token is set
  useEffect(() => {
    if (!deviceToken) return
    startCamera()
    return () => stopCamera()
  }, [deviceToken])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setScanning(true)
        requestAnimationFrame(scanFrame)
      }
    } catch (e) {
      setCameraError("Camera access denied. Please allow camera access and refresh.")
    }
  }

  function stopCamera() {
    const video = videoRef.current
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      video.srcObject = null
    }
    setScanning(false)
  }

  const scanFrame = useCallback(async () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      requestAnimationFrame(scanFrame)
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    // Use BarcodeDetector if available (Chrome/Android), else skip
    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] })
        const codes = await detector.detect(canvas)
        if (codes.length > 0) {
          const now = Date.now()
          if (now - lastScanRef.current > SCAN_COOLDOWN) {
            lastScanRef.current = now
            await processQr(codes[0].rawValue)
          }
        }
      } catch {}
    }

    requestAnimationFrame(scanFrame)
  }, [deviceToken])

  async function processQr(qrPayload: string) {
    if (!deviceToken) return
    try {
      const res = await fetch("/api/staff-attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrPayload, deviceToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ name: "", status: "ABSENT", checkInTime: "", alreadyRecorded: false, error: data.error ?? "Scan failed" })
      } else {
        setResult(data)
      }
      // Clear result after 4 seconds
      setTimeout(() => setResult(null), 4000)
    } catch {
      setResult({ name: "", status: "ABSENT", checkInTime: "", alreadyRecorded: false, error: "Network error" })
      setTimeout(() => setResult(null), 3000)
    }
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = pinInput.trim()
    if (!token) { setPinError("Please enter your device token"); return }
    localStorage.setItem(STORAGE_KEY, token)
    setDeviceToken(token)
    setPinError("")
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY)
    setDeviceToken(null)
    stopCamera()
    setPinInput("")
  }

  const timeStr = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const dateStr = time.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })

  // ── Device setup screen ──────────────────────────────────────────────────
  if (!deviceToken) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">Kiosk Setup</h1>
              <p className="text-sm text-gray-400">Enter the device token from your admin panel</p>
            </div>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="text"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              placeholder="Paste device token here"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            {pinError && <p className="text-red-400 text-sm">{pinError}</p>}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Activate Kiosk
            </button>
          </form>

          <p className="text-xs text-gray-600 mt-4 text-center">
            Get the device token from: Admin Dashboard → HR → Staff Attendance → Kiosk Devices
          </p>
        </div>
      </div>
    )
  }

  // ── Active kiosk screen ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <QrCode className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">NexSchoola · Staff Check-In</p>
            <p className="text-gray-400 text-xs">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white font-mono font-bold text-xl">{timeStr}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 relative flex items-center justify-center">

        {/* Camera feed */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan overlay */}
        {!result && (
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Viewfinder */}
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 border-2 border-indigo-500 rounded-2xl opacity-60" />
              {/* Corner marks */}
              {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                <div
                  key={i}
                  className={`absolute w-8 h-8 border-indigo-400 ${pos} ${
                    i === 0 ? "border-t-4 border-l-4 rounded-tl-lg" :
                    i === 1 ? "border-t-4 border-r-4 rounded-tr-lg" :
                    i === 2 ? "border-b-4 border-l-4 rounded-bl-lg" :
                             "border-b-4 border-r-4 rounded-br-lg"
                  }`}
                />
              ))}
              {/* Scanning line */}
              {scanning && (
                <div className="absolute left-4 right-4 h-0.5 bg-indigo-400 animate-bounce top-1/2" />
              )}
            </div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold">Scan Your ID</p>
              <p className="text-gray-400 text-sm mt-1">Hold your QR code badge in front of the camera</p>
            </div>
            {cameraError && (
              <div className="bg-red-900/50 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm text-center max-w-xs">
                {cameraError}
              </div>
            )}
          </div>
        )}

        {/* Scan result overlay */}
        {result && (
          <div className="relative z-20 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {result.error ? (
              <div className="bg-red-900/90 border border-red-600 rounded-3xl px-12 py-8 text-center">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
                <p className="text-white text-xl font-bold">Invalid QR Code</p>
                <p className="text-red-300 text-sm mt-1">{result.error}</p>
              </div>
            ) : result.alreadyRecorded ? (
              <div className="bg-amber-900/90 border border-amber-600 rounded-3xl px-12 py-8 text-center">
                <Clock className="w-16 h-16 text-amber-400 mx-auto mb-3" />
                <p className="text-white text-2xl font-extrabold">{result.name}</p>
                <p className="text-amber-300 font-semibold mt-1">Already checked in today</p>
                {result.checkInTime && (
                  <p className="text-amber-400 text-sm mt-1">
                    Recorded at {new Date(result.checkInTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            ) : result.status === "LATE" ? (
              <div className="bg-amber-900/90 border border-amber-600 rounded-3xl px-12 py-8 text-center">
                <Clock className="w-16 h-16 text-amber-400 mx-auto mb-3" />
                <p className="text-white text-2xl font-extrabold">{result.name}</p>
                <p className="text-amber-300 text-lg font-bold mt-1">🟡 LATE</p>
                <p className="text-amber-400 text-sm mt-1">
                  {new Date(result.checkInTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ) : (
              <div className="bg-emerald-900/90 border border-emerald-600 rounded-3xl px-12 py-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
                <p className="text-white text-2xl font-extrabold">{result.name}</p>
                <p className="text-emerald-300 text-lg font-bold mt-1">✅ Welcome!</p>
                <p className="text-emerald-400 text-sm mt-1">
                  {new Date(result.checkInTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
