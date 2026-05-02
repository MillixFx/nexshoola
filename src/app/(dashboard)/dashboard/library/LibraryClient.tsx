"use client"

import { useState } from "react"
import { Library, Plus, Pencil, Trash2 } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type Book = { id: string; title: string; author: string | null; isbn: string | null; category: string | null; quantity: number; availableQty: number; shelfNo: string | null }
const emptyForm = { title: "", author: "", isbn: "", category: "", quantity: "1", shelfNo: "" }

function mapBook(raw: any): Book {
  return { id: raw.id, title: raw.title, author: raw.author ?? null, isbn: raw.isbn ?? null, category: raw.category ?? raw.categoryName ?? null, quantity: raw.quantity, availableQty: raw.availableQty ?? raw.available ?? raw.quantity, shelfNo: raw.shelfNo ?? null }
}

export default function LibraryClient({ books: initial, schoolId }: { books: Book[]; schoolId: string }) {
  const [books, setBooks] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Book | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  function openAdd() { setEditing(null); setForm(emptyForm); setError(""); setOpen(true) }
  function openEdit(b: Book) {
    setEditing(b)
    setForm({ title: b.title, author: b.author ?? "", isbn: b.isbn ?? "", category: b.category ?? "", quantity: String(b.quantity), shelfNo: b.shelfNo ?? "" })
    setError(""); setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      if (editing) {
        const res = await fetch(`/api/library/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = mapBook(await res.json())
        setBooks(prev => prev.map(b => b.id === editing.id ? updated : b))
      } else {
        const res = await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
        if (!res.ok) throw new Error((await res.json()).error)
        const book = mapBook(await res.json())
        setBooks(prev => [...prev, book])
      }
      setOpen(false); setForm(emptyForm); setEditing(null)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  function handleDelete(id: string) {
    setConfirmModal({
      message: "Remove this book?",
      onConfirm: async () => {
        await fetch(`/api/library/${id}`, { method: "DELETE" })
        setBooks(prev => prev.filter(b => b.id !== id))
      }
    })
  }

  const filtered = books.filter(b =>
    [b.title, b.author, b.isbn, b.category].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description={`${books.length} book${books.length !== 1 ? "s" : ""} catalogued`}
        action={
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus className="w-4 h-4" /> Add Book
          </button>
        }
      />

      {/* Stats */}
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
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline">+ Add Book</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input
              className="w-full sm:w-64 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search books, authors, ISBN…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ISBN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Shelf</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Copies</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No books found.</td></tr>
                ) : filtered.map(b => (
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
                        <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">{filtered.length} of {books.length} books</div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Book" : "Add Book"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
              <div><label className="label">Title *</label><input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="New General Mathematics" /></div>
              <div><label className="label">Author</label><input className="input" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">ISBN</label><input className="input" value={form.isbn} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))} /></div>
                <div><label className="label">Category</label><input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Mathematics" /></div>
                <div><label className="label">Quantity</label><input className="input" type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><label className="label">Shelf No.</label><input className="input" value={form.shelfNo} onChange={e => setForm(f => ({ ...f, shelfNo: e.target.value }))} placeholder="A-12" /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
      <ConfirmModal
        open={!!confirmModal}
        message={confirmModal?.message ?? ""}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null) }}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  )
}
