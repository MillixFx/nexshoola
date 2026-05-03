"use client"

import { useState, useMemo } from "react"
import { Library, Plus, Pencil, Trash2, BookOpen, RotateCcw, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import ConfirmModal from "@/components/dashboard/ConfirmModal"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────
type Book = {
  id: string; title: string; author: string | null; isbn: string | null
  category: string | null; quantity: number; availableQty: number; shelfNo: string | null
}
type Issue = {
  id: string
  status: "ISSUED" | "RETURNED" | "OVERDUE"
  issueDate: string; dueDate: string; returnDate: string | null
  book: { id: string; title: string; author: string | null; isbn: string | null }
  member: { id: string; user: { id: string; name: string; role: string } }
}
type AppUser = { id: string; name: string; role: string }

const emptyBookForm = { title: "", author: "", isbn: "", category: "", quantity: "1", shelfNo: "" }

function defaultDueDate() {
  const d = new Date(); d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

function mapBook(raw: any): Book {
  return {
    id: raw.id, title: raw.title,
    author: raw.author ?? null, isbn: raw.isbn ?? null,
    category: raw.category ?? raw.categoryName ?? null,
    quantity: raw.quantity,
    availableQty: raw.availableQty ?? raw.available ?? raw.quantity,
    shelfNo: raw.shelfNo ?? null,
  }
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Student", TEACHER: "Teacher", ADMIN: "Admin",
  HEADMASTER: "Head", ACCOUNTANT: "Accountant", LIBRARIAN: "Librarian",
  HR: "HR", DRIVER: "Driver", HOSTEL_MANAGER: "Hostel",
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LibraryClient({
  books: initBooks, issues: initIssues, users, schoolId,
}: {
  books: Book[]; issues: Issue[]; users: AppUser[]; schoolId: string
}) {
  const [tab, setTab]         = useState<"books" | "issues">("books")
  const [books, setBooks]     = useState(initBooks)
  const [issues, setIssues]   = useState(initIssues)

  // Book CRUD state
  const [bookOpen, setBookOpen]   = useState(false)
  const [editBook, setEditBook]   = useState<Book | null>(null)
  const [bookForm, setBookForm]   = useState(emptyBookForm)
  const [bookSaving, setBookSaving] = useState(false)
  const [bookError, setBookError] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // Issue state
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueForm, setIssueForm] = useState({ bookId: "", userId: "", dueDate: defaultDueDate() })
  const [issueSaving, setIssueSaving] = useState(false)
  const [issueError, setIssueError] = useState("")
  const [returningId, setReturningId] = useState<string | null>(null)
  const [issueFilter, setIssueFilter] = useState<"ALL" | "ISSUED" | "RETURNED" | "OVERDUE">("ISSUED")
  const [issueSearch, setIssueSearch] = useState("")

  // ── Book CRUD ──────────────────────────────────────────────────────────────
  function openAddBook() { setEditBook(null); setBookForm(emptyBookForm); setBookError(""); setBookOpen(true) }
  function openEditBook(b: Book) {
    setEditBook(b)
    setBookForm({ title: b.title, author: b.author ?? "", isbn: b.isbn ?? "", category: b.category ?? "", quantity: String(b.quantity), shelfNo: b.shelfNo ?? "" })
    setBookError(""); setBookOpen(true)
  }

  async function handleBookSubmit(e: React.FormEvent) {
    e.preventDefault(); setBookSaving(true); setBookError("")
    try {
      if (editBook) {
        const res = await fetch(`/api/library/${editBook.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bookForm) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setBooks(prev => prev.map(b => b.id === editBook.id ? mapBook(data) : b))
      } else {
        const res = await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...bookForm, schoolId }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setBooks(prev => [...prev, mapBook(data)])
      }
      setBookOpen(false); setEditBook(null)
    } catch (err: any) { setBookError(err.message) } finally { setBookSaving(false) }
  }

  function handleDeleteBook(id: string) {
    setConfirmModal({
      message: "Remove this book from the catalog?",
      onConfirm: async () => {
        await fetch(`/api/library/${id}`, { method: "DELETE" })
        setBooks(prev => prev.filter(b => b.id !== id))
      },
    })
  }

  // ── Issue / Return ─────────────────────────────────────────────────────────
  function openIssueModal() {
    setIssueForm({ bookId: "", userId: "", dueDate: defaultDueDate() })
    setIssueError("")
    setIssueOpen(true)
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault(); setIssueSaving(true); setIssueError("")
    try {
      const res = await fetch("/api/library/issues", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issueForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIssues(prev => [data, ...prev])
      // Update available count
      setBooks(prev => prev.map(b => b.id === data.book.id ? { ...b, availableQty: b.availableQty - 1 } : b))
      setIssueOpen(false)
    } catch (err: any) { setIssueError(err.message) } finally { setIssueSaving(false) }
  }

  async function handleReturn(id: string) {
    setReturningId(id)
    try {
      const res = await fetch(`/api/library/issues/${id}`, { method: "PUT" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIssues(prev => prev.map(i => i.id === id ? data : i))
      setBooks(prev => prev.map(b => b.id === data.book.id ? { ...b, availableQty: b.availableQty + 1 } : b))
    } catch (err: any) { alert(err.message) } finally { setReturningId(null) }
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const filteredBooks = useMemo(() =>
    books.filter(b => [b.title, b.author, b.isbn, b.category].some(v => v?.toLowerCase().includes(bookSearch.toLowerCase()))),
    [books, bookSearch]
  )

  const enrichedIssues = useMemo(() => {
    const now = new Date()
    return issues.map(i => ({
      ...i,
      isOverdue: i.status === "ISSUED" && new Date(i.dueDate) < now,
    }))
  }, [issues])

  const filteredIssues = useMemo(() => {
    return enrichedIssues
      .filter(i => {
        if (issueFilter === "ISSUED")   return i.status === "ISSUED" && !i.isOverdue
        if (issueFilter === "OVERDUE")  return i.isOverdue
        if (issueFilter === "RETURNED") return i.status === "RETURNED"
        return true
      })
      .filter(i =>
        issueSearch === "" ||
        i.book.title.toLowerCase().includes(issueSearch.toLowerCase()) ||
        i.member.user.name.toLowerCase().includes(issueSearch.toLowerCase())
      )
  }, [enrichedIssues, issueFilter, issueSearch])

  const issuedCount  = enrichedIssues.filter(i => i.status === "ISSUED" && !i.isOverdue).length
  const overdueCount = enrichedIssues.filter(i => i.isOverdue).length
  const availableBooks = books.filter(b => b.availableQty > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description={`${books.length} titles · ${books.reduce((s, b) => s + b.availableQty, 0)} copies available`}
        action={
          tab === "books" ? (
            <button onClick={openAddBook} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
              <Plus className="w-4 h-4" /> Add Book
            </button>
          ) : (
            <button onClick={openIssueModal} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
              <BookOpen className="w-4 h-4" /> Issue Book
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: "books",  label: "Book Catalog", icon: Library },
          { key: "issues", label: `Book Issues${overdueCount > 0 ? ` (${overdueCount} overdue)` : ""}`, icon: BookOpen },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors",
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Books Tab ── */}
      {tab === "books" && (
        <>
          {books.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-extrabold text-indigo-700">{books.length}</p>
                <p className="text-xs font-semibold text-indigo-500 mt-0.5">Total Titles</p>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-extrabold text-emerald-700">{books.reduce((s, b) => s + b.availableQty, 0)}</p>
                <p className="text-xs font-semibold text-emerald-500 mt-0.5">Available Copies</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-700">{books.reduce((s, b) => s + b.quantity, 0)}</p>
                <p className="text-xs font-semibold text-amber-500 mt-0.5">Total Copies</p>
              </div>
            </div>
          )}

          {books.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
              <Library className="w-10 h-10 text-indigo-300 mb-3" />
              <h2 className="font-bold text-gray-800 mb-1">No books yet</h2>
              <p className="text-sm text-gray-500 mb-3">Start cataloguing your school library</p>
              <button onClick={openAddBook} className="text-sm font-semibold text-indigo-600 hover:underline">+ Add Book</button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <input className="w-full sm:w-64 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Search books, authors, ISBN…" value={bookSearch} onChange={e => setBookSearch(e.target.value)} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Title", "Author", "ISBN", "Category", "Shelf", "Copies", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredBooks.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No books found.</td></tr>
                    ) : filteredBooks.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
                        <td className="px-4 py-3 text-gray-500">{b.author ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{b.isbn ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{b.category ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{b.shelfNo ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("font-bold", b.availableQty === 0 ? "text-red-600" : "text-emerald-600")}>
                            {b.availableQty}
                          </span>
                          <span className="text-gray-400">/{b.quantity}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEditBook(b)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteBook(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">{filteredBooks.length} of {books.length} books</div>
            </div>
          )}
        </>
      )}

      {/* ── Issues Tab ── */}
      {tab === "issues" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Currently Issued", value: issuedCount,  color: "bg-indigo-50 text-indigo-700", icon: BookOpen },
              { label: "Overdue",          value: overdueCount, color: "bg-red-50 text-red-700",     icon: AlertCircle },
              { label: "Returned",         value: enrichedIssues.filter(i => i.status === "RETURNED").length, color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
            ].map(s => (
              <div key={s.label} className={cn("rounded-2xl p-4 flex items-center gap-3", s.color)}>
                <s.icon className="w-6 h-6 shrink-0" />
                <div>
                  <p className="text-2xl font-extrabold">{s.value}</p>
                  <p className="text-xs font-semibold mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter + search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {(["ALL", "ISSUED", "OVERDUE", "RETURNED"] as const).map(f => (
                <button key={f} onClick={() => setIssueFilter(f)}
                  className={cn("px-3 py-1 text-xs font-semibold rounded-lg transition-colors",
                    issueFilter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}>
                  {f === "ALL" ? "All" : f === "ISSUED" ? "Active" : f === "OVERDUE" ? "Overdue" : "Returned"}
                </button>
              ))}
            </div>
            <input className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-56"
              placeholder="Search name or book…" value={issueSearch} onChange={e => setIssueSearch(e.target.value)} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredIssues.length === 0 ? (
              <div className="p-14 flex flex-col items-center text-center">
                <BookOpen className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No issues found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Borrower", "Book", "Issued", "Due Date", "Returned", "Status", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredIssues.map(i => {
                      const overdue = i.isOverdue
                      const due = new Date(i.dueDate)
                      return (
                        <tr key={i.id} className={cn("hover:bg-gray-50/50", overdue && "bg-red-50/30")}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{i.member.user.name}</p>
                            <p className="text-xs text-gray-400">{ROLE_LABELS[i.member.user.role] ?? i.member.user.role}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{i.book.title}</p>
                            {i.book.author && <p className="text-xs text-gray-400">{i.book.author}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{new Date(i.issueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td className="px-4 py-3 text-xs">
                            <span className={cn("font-semibold", overdue ? "text-red-600" : "text-gray-700")}>
                              {due.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            {overdue && <p className="text-red-500 text-[10px]">Overdue</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {i.returnDate ? new Date(i.returnDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {i.status === "RETURNED" ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Returned
                              </span>
                            ) : overdue ? (
                              <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                                <AlertCircle className="w-3 h-3" /> Overdue
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-indigo-600 font-semibold">
                                <Clock className="w-3 h-3" /> Issued
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {i.status !== "RETURNED" && (
                              <button
                                onClick={() => handleReturn(i.id)}
                                disabled={returningId === i.id}
                                className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full hover:bg-emerald-100 disabled:opacity-60"
                              >
                                <RotateCcw className="w-3 h-3" />
                                {returningId === i.id ? "…" : "Return"}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add/Edit Book Modal ── */}
      {bookOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editBook ? "Edit Book" : "Add Book"}</h2>
              <button onClick={() => setBookOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleBookSubmit} className="p-6 space-y-4">
              {bookError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{bookError}</div>}
              <div><label className="label">Title *</label><input className="input" required value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} placeholder="New General Mathematics" /></div>
              <div><label className="label">Author</label><input className="input" value={bookForm.author} onChange={e => setBookForm(f => ({ ...f, author: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">ISBN</label><input className="input" value={bookForm.isbn} onChange={e => setBookForm(f => ({ ...f, isbn: e.target.value }))} /></div>
                <div><label className="label">Category</label><input className="input" value={bookForm.category} onChange={e => setBookForm(f => ({ ...f, category: e.target.value }))} placeholder="Mathematics" /></div>
                <div><label className="label">Quantity</label><input className="input" type="number" min="1" value={bookForm.quantity} onChange={e => setBookForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><label className="label">Shelf No.</label><input className="input" value={bookForm.shelfNo} onChange={e => setBookForm(f => ({ ...f, shelfNo: e.target.value }))} placeholder="A-12" /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setBookOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={bookSaving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {bookSaving ? "Saving…" : editBook ? "Save Changes" : "Add Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Issue Book Modal ── */}
      {issueOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Issue Book</h2>
              <button onClick={() => setIssueOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleIssue} className="p-6 space-y-4">
              {issueError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{issueError}</div>}
              <div>
                <label className="label">Book *</label>
                <select className="input" required value={issueForm.bookId} onChange={e => setIssueForm(f => ({ ...f, bookId: e.target.value }))}>
                  <option value="">— Select book —</option>
                  {availableBooks.map(b => (
                    <option key={b.id} value={b.id}>{b.title} ({b.availableQty} available)</option>
                  ))}
                </select>
                {availableBooks.length === 0 && <p className="text-xs text-red-500 mt-1">No copies currently available.</p>}
              </div>
              <div>
                <label className="label">Borrower *</label>
                <select className="input" required value={issueForm.userId} onChange={e => setIssueForm(f => ({ ...f, userId: e.target.value }))}>
                  <option value="">— Select person —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {ROLE_LABELS[u.role] ?? u.role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Due Date *</label>
                <input type="date" className="input" required value={issueForm.dueDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setIssueForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setIssueOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={issueSaving || availableBooks.length === 0} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {issueSaving ? "Issuing…" : "Issue Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display: block; font-size: .75rem; font-weight: 500; color: #374151; margin-bottom: .375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: .75rem; padding: .625rem .875rem; font-size: .875rem; outline: none; }
        .input:focus { outline: 2px solid #6366f1; border-color: #6366f1; }
      `}</style>

      <ConfirmModal
        open={!!confirmModal}
        message={confirmModal?.message ?? ""}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null) }}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  )
}
