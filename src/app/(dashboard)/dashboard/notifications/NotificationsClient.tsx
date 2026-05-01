"use client"

import { useState } from "react"
import { Send, MessageSquare, CheckCircle2, AlertCircle, Loader2, Phone, Lightbulb, AlertTriangle } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { cn } from "@/lib/utils"

type Class = { id: string; name: string; section: string | null }
type Audience = "ALL_PARENTS" | "ALL_TEACHERS" | "ALL_STUDENTS" | "CLASS_PARENTS" | "STAFF"
type Channel = "SMS" | "WHATSAPP" | "BOTH"

const AUDIENCE_OPTS: { value: Audience; label: string; description: string }[] = [
  { value: "ALL_PARENTS",   label: "All Parents",        description: "Every parent in the school" },
  { value: "ALL_TEACHERS",  label: "All Teachers",       description: "All teaching staff" },
  { value: "ALL_STUDENTS",  label: "All Students",       description: "Every active student" },
  { value: "CLASS_PARENTS", label: "Parents of a Class", description: "Pick a specific class" },
  { value: "STAFF",         label: "All Admin Staff",    description: "Admins + Headmaster" },
]

export default function NotificationsClient({ classes }: { classes: Class[] }) {
  const [audience, setAudience] = useState<Audience>("ALL_PARENTS")
  const [classId, setClassId] = useState("")
  const [channel, setChannel] = useState<Channel>("SMS")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [error, setError] = useState("")

  async function handleSend() {
    if (!message.trim()) {
      setError("Message is required")
      return
    }
    if (audience === "CLASS_PARENTS" && !classId) {
      setError("Choose a class")
      return
    }
    setError(""); setResult(null); setSending(true)
    try {
      const body: any = { message: message.trim(), channel }
      if (audience === "CLASS_PARENTS") body.classId = classId
      else if (audience === "ALL_PARENTS") body.role = "PARENT"
      else if (audience === "ALL_TEACHERS") body.role = "TEACHER"
      else if (audience === "ALL_STUDENTS") body.role = "STUDENT"
      else if (audience === "STAFF") body.role = "ADMIN"

      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({ sent: data.sent, failed: data.failed, total: data.total })
      if (data.sent > 0) setMessage("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const charCount = message.length
  const smsParts = Math.ceil(charCount / 160) || 1

  return (
    <div className="space-y-6">
      <PageHeader title="SMS & WhatsApp" description="Send bulk notifications to parents, teachers, and students" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 block">Recipients</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AUDIENCE_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  className={cn(
                    "text-left p-3 rounded-xl border-2 transition-all",
                    audience === opt.value ? "border-indigo-500 bg-indigo-50" : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {audience === "CLASS_PARENTS" && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Class</label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select class —</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 block">Channel</label>
            <div className="flex gap-2">
              {(["SMS", "WHATSAPP", "BOTH"] as Channel[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all",
                    channel === c ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-100 text-gray-600 hover:border-gray-200"
                  )}
                >
                  {c === "BOTH" ? "SMS + WhatsApp" : c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Message</label>
              <span className={cn("text-xs", charCount > 160 ? "text-amber-600" : "text-gray-400")}>
                {charCount} chars · {smsParts} SMS
              </span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hello, this is a message from the school…"
              rows={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1.5 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>SMS messages over 160 characters will be sent as multiple parts (charged per part).</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {result && (
            <div className={cn(
              "p-4 rounded-xl border-2",
              result.failed === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
            )}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {result.failed === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
                <span className={result.failed === 0 ? "text-emerald-800" : "text-amber-800"}>
                  Sent to {result.sent} of {result.total}
                </span>
              </div>
              {result.failed > 0 && <p className="text-xs text-amber-700">{result.failed} failed — check logs for details.</p>}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending…" : "Send Notification"}
          </button>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
            <MessageSquare className="w-6 h-6 text-indigo-600 mb-2" />
            <h3 className="font-bold text-gray-900 mb-1">How it works</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Messages are sent via Hubtel — Ghana's leading SMS gateway. They reach all networks
              (MTN, Vodafone, AirtelTigo). Recipients without a phone number on file are skipped automatically.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Auto Notifications</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Parents get an SMS when fees are paid</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Parents get an SMS when their child is marked absent</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Templates available for fees, exams, notices</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 text-xs text-amber-800">
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Hubtel credentials required
            </p>
            <p>
              Set <code className="bg-amber-100 px-1 rounded">HUBTEL_CLIENT_ID</code>,{" "}
              <code className="bg-amber-100 px-1 rounded">HUBTEL_CLIENT_SECRET</code>, and{" "}
              <code className="bg-amber-100 px-1 rounded">HUBTEL_SMS_SENDER_ID</code> in env vars to enable real sending.
              Until then, messages are logged to the console.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
