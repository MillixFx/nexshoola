"use client"

import { useState } from "react"
import { MessageSquare, Plus, Send } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatDate, cn } from "@/lib/utils"

type Message = { id: string; subject: string | null; body: string; createdAt: string | Date; sender: { name: string; role: string } }
type User = { id: string; name: string; role: string }

const ROLE_BADGE: Record<string, string> = { ADMIN: "bg-purple-50 text-purple-700", TEACHER: "bg-emerald-50 text-emerald-700", STUDENT: "bg-blue-50 text-blue-700", PARENT: "bg-amber-50 text-amber-700", HEADMASTER: "bg-red-50 text-red-700" }

export default function MessagesClient({ messages: initial, users, schoolId }: { messages: Message[]; users: User[]; schoolId: string }) {
  const [messages, setMessages] = useState(initial)
  const [selected, setSelected] = useState<Message | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ recipientIds: [] as string[], subject: "", body: "" })
  const [saving, setSaving] = useState(false)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
      if (res.ok) { setOpen(false); setForm({ recipientIds: [], subject: "", body: "" }) }
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Internal school messaging" action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> New Message</button>
      } />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Message list */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Inbox ({messages.length})</h3></div>
          {messages.length === 0 ? (
            <div className="p-10 text-center"><MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No messages</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {messages.map(m => (
                <button key={m.id} onClick={() => setSelected(m)} className={cn("w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors", selected?.id === m.id && "bg-indigo-50")}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm truncate font-medium text-gray-900">{m.subject}</p>
                  </div>
                  <p className="text-xs text-gray-400 truncate">From: {m.sender.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(m.createdAt)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message view */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          {selected ? (
            <div className="p-6">
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-1">{selected.subject}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>From: <span className="font-medium text-gray-700">{selected.sender.name}</span></span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_BADGE[selected.sender.role] || "bg-gray-100 text-gray-600")}>{selected.sender.role}</span>
                  <span>· {formatDate(selected.createdAt)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.body}</p>
            </div>
          ) : (
            <div className="p-14 flex flex-col items-center justify-center text-center h-full">
              <MessageSquare className="w-10 h-10 text-gray-300 mb-3" /><p className="text-sm text-gray-400">Select a message to read</p>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">New Message</h2><button onClick={() => setOpen(false)} className="text-gray-400 text-xl">×</button></div>
            <form onSubmit={handleSend} className="p-6 space-y-4">
              <div>
                <label className="label">Recipients *</label>
                <select className="input" multiple size={4} value={form.recipientIds} onChange={e => setForm(f => ({ ...f, recipientIds: Array.from(e.target.selectedOptions, o => o.value) }))}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
              <div><label className="label">Subject *</label><input className="input" required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
              <div><label className="label">Message *</label><textarea className="input min-h-[120px] resize-none" required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />{saving ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
    </div>
  )
}
