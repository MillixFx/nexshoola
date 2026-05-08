"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Send, Search, MessageSquare, Plus, ArrowLeft, Users as UsersIcon, X, Loader2, Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type ChatUser = { id: string; name: string; email?: string; role: string; avatar?: string | null }
type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
  sender: { id: string; name: string; role: string; avatar: string | null }
}
type Conversation = {
  id: string
  isGroup: boolean
  name: string | null
  updatedAt: string
  participants: ChatUser[]
  lastMessage: { id: string; content: string; createdAt: string; senderId: string } | null
  unreadCount: number
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  HEADMASTER: "bg-rose-100 text-rose-700",
  TEACHER: "bg-emerald-100 text-emerald-700",
  STUDENT: "bg-blue-100 text-blue-700",
  PARENT: "bg-amber-100 text-amber-700",
  ACCOUNTANT: "bg-indigo-100 text-indigo-700",
  LIBRARIAN: "bg-cyan-100 text-cyan-700",
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString()
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function ChatClient({
  currentUserId, currentUserName, currentUserRole,
}: { currentUserId: string; currentUserName: string; currentUserRole: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [newSearch, setNewSearch] = useState("")
  const [users, setUsers] = useState<ChatUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [startingConv, setStartingConv] = useState<string | null>(null)
  const [convError, setConvError] = useState("")

  const messageRef = useRef<HTMLDivElement>(null)
  const lastSinceRef = useRef<string>("")

  const active = conversations.find(c => c.id === activeId) ?? null

  // ── Fetch conversations
  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/chat/conversations")
    if (res.ok) setConversations(await res.json())
  }, [])

  useEffect(() => {
    fetchConversations()
    const t = setInterval(fetchConversations, 8000)
    return () => clearInterval(t)
  }, [fetchConversations])

  // ── Load messages when conversation opens
  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    setLoadingMessages(true)
    fetch(`/api/chat/conversations/${activeId}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ChatMessage[]) => {
        setMessages(data)
        if (data.length > 0) lastSinceRef.current = data[data.length - 1].createdAt
        else lastSinceRef.current = new Date().toISOString()
      })
      .finally(() => setLoadingMessages(false))
    // Mark as read
    fetch(`/api/chat/conversations/${activeId}/read`, { method: "POST" })
  }, [activeId])

  // ── Poll new messages every 4s for active chat
  useEffect(() => {
    if (!activeId) return
    const t = setInterval(async () => {
      const since = lastSinceRef.current
      const res = await fetch(`/api/chat/conversations/${activeId}/messages?since=${encodeURIComponent(since)}`)
      if (res.ok) {
        const newMsgs: ChatMessage[] = await res.json()
        if (newMsgs.length > 0) {
          setMessages(prev => [...prev, ...newMsgs])
          lastSinceRef.current = newMsgs[newMsgs.length - 1].createdAt
          fetch(`/api/chat/conversations/${activeId}/read`, { method: "POST" })
        }
      }
    }, 4000)
    return () => clearInterval(t)
  }, [activeId])

  // ── Auto-scroll on new messages
  useEffect(() => {
    if (messageRef.current) messageRef.current.scrollTop = messageRef.current.scrollHeight
  }, [messages])

  // ── Send message
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    if (!activeId || !draft.trim() || sending) return
    setSending(true)
    const content = draft.trim()
    setDraft("")
    try {
      const res = await fetch(`/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, msg])
        lastSinceRef.current = msg.createdAt
        fetchConversations()
      }
    } finally { setSending(false) }
  }

  // ── New conversation modal
  async function openNew() {
    setShowNew(true)
    setConvError("") // clear any stale error from a previous attempt
    if (users.length === 0) {
      setUsersLoading(true)
      try {
        const res = await fetch("/api/chat/users")
        if (res.ok) setUsers(await res.json())
      } catch { /* network error */ } finally {
        setUsersLoading(false)
      }
    }
  }

  async function startConversation(userId: string) {
    setStartingConv(userId)
    setConvError("")
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] }),
      })
      let data: any = null
      try { data = await res.json() } catch { /* empty body */ }
      if (!res.ok) throw new Error(data?.error || "Failed to start conversation")
      if (!data?.id) throw new Error("Invalid response from server")
      setShowNew(false)
      setNewSearch("")
      setActiveId(data.id)
      await fetchConversations()
    } catch (err: any) {
      setConvError(err.message || "Something went wrong")
    } finally {
      setStartingConv(null)
    }
  }

  // ── Conversation display helpers
  function convName(c: Conversation): string {
    if (c.isGroup) return c.name ?? "Group Chat"
    const other = c.participants.find(p => p.id !== currentUserId)
    return other?.name ?? "Unknown"
  }
  function convRole(c: Conversation): string | null {
    if (c.isGroup) return null
    const other = c.participants.find(p => p.id !== currentUserId)
    return other?.role ?? null
  }

  const filteredConvs = conversations.filter(c =>
    convName(c).toLowerCase().includes(search.toLowerCase())
  )

  const filteredUsers = users.filter(u =>
    [u.name, u.email, u.role].some(v => v?.toLowerCase().includes(newSearch.toLowerCase()))
  )

  return (
    <div className="-m-4 sm:-m-6 h-[calc(100vh-64px)] flex bg-white">
      {/* ── Conversations list (left panel) */}
      <aside className={cn(
        "w-full sm:w-80 sm:max-w-xs border-r border-gray-100 flex flex-col bg-white",
        activeId && "hidden sm:flex"
      )}>
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <h1 className="text-lg font-bold text-gray-900 flex-1">Chat</h1>
          <button onClick={openNew} className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700" title="New chat">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No conversations yet</p>
              <button onClick={openNew} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">
                + Start one
              </button>
            </div>
          ) : (
            <ul>
              {filteredConvs.map(c => {
                const name = convName(c)
                const role = convRole(c)
                const isActive = c.id === activeId
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveId(c.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left",
                        isActive && "bg-indigo-50 hover:bg-indigo-50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                        c.isGroup ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"
                      )}>
                        {c.isGroup ? <UsersIcon className="w-5 h-5" /> : initials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900 truncate flex-1">{name}</p>
                          {c.lastMessage && (
                            <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(c.lastMessage.createdAt)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500 truncate flex-1">
                            {c.lastMessage ? (
                              <>
                                {c.lastMessage.senderId === currentUserId ? "You: " : ""}
                                {c.lastMessage.content}
                              </>
                            ) : (
                              <span className="italic text-gray-400">No messages yet</span>
                            )}
                          </p>
                          {c.unreadCount > 0 && (
                            <span className="text-[10px] font-bold bg-indigo-600 text-white rounded-full px-1.5 py-0.5 min-w-5 text-center">
                              {c.unreadCount > 99 ? "99+" : c.unreadCount}
                            </span>
                          )}
                        </div>
                        {role && (
                          <span className={cn("inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded", ROLE_COLOR[role] ?? "bg-gray-100 text-gray-600")}>
                            {role}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ── Active chat (right panel) */}
      <section className={cn("flex-1 flex flex-col bg-gray-50", !activeId && "hidden sm:flex")}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <header className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
              <button onClick={() => setActiveId(null)} className="sm:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                active.isGroup ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"
              )}>
                {active.isGroup ? <UsersIcon className="w-5 h-5" /> : initials(convName(active))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{convName(active)}</p>
                <p className="text-xs text-gray-500 truncate">
                  {active.isGroup
                    ? `${active.participants.length} members`
                    : convRole(active)}
                </p>
              </div>
            </header>

            {/* Messages */}
            <div ref={messageRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 mt-8">No messages yet — say hello</p>
              ) : (
                messages.map((m, i) => {
                  const mine = m.senderId === currentUserId
                  const prevSameSender = i > 0 && messages[i - 1].senderId === m.senderId
                  return (
                    <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                      {!mine && !prevSameSender && (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {initials(m.sender.name)}
                        </div>
                      )}
                      {!mine && prevSameSender && <div className="w-8 shrink-0" />}
                      <div className={cn("max-w-[75%] sm:max-w-[60%]", mine && "items-end")}>
                        {!mine && !prevSameSender && active.isGroup && (
                          <p className="text-[11px] font-semibold text-gray-500 mb-0.5 ml-1">{m.sender.name}</p>
                        )}
                        <div className={cn(
                          "rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm",
                          mine ? "bg-indigo-600 text-white rounded-br-md" : "bg-white text-gray-900 rounded-bl-md border border-gray-100"
                        )}>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <p className={cn("text-[10px] mt-1 flex items-center gap-1", mine ? "text-indigo-200 justify-end" : "text-gray-400")}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {mine && <CheckCheck className="w-3 h-3" />}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-gray-100 bg-white flex items-end gap-2 shrink-0">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 max-h-32"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}
      </section>

      {/* ── New conversation modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">New Conversation</h2>
                {currentUserRole === "PARENT" && (
                  <p className="text-xs text-gray-400 mt-0.5">You can message school staff only</p>
                )}
                {currentUserRole === "STUDENT" && (
                  <p className="text-xs text-gray-400 mt-0.5">Message staff or fellow students</p>
                )}
              </div>
              <button onClick={() => { setShowNew(false); setNewSearch(""); setConvError("") }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  value={newSearch}
                  onChange={e => setNewSearch(e.target.value)}
                  placeholder={
                    currentUserRole === "PARENT"
                      ? "Search staff by name…"
                      : currentUserRole === "STUDENT"
                      ? "Search staff or students…"
                      : "Search by name, email, or role…"
                  }
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-indigo-300"
                />
              </div>
              {convError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{convError}</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {usersLoading ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
              ) : filteredUsers.length === 0 ? (
                <p className="p-8 text-center text-sm text-gray-400">No users found</p>
              ) : (
                <ul>
                  {filteredUsers.map(u => (
                    <li key={u.id}>
                      <button
                        onClick={() => startConversation(u.id)}
                        disabled={!!startingConv}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left disabled:opacity-60 transition-opacity"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {startingConv === u.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : initials(u.name)
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", ROLE_COLOR[u.role] ?? "bg-gray-100 text-gray-600")}>
                          {u.role}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
