"use client"

import { useState } from "react"
import { Library, Plus, Trash2 } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"

type Book = { id: string; title: string; author: string | null; isbn: string | null; category: string | null; quantity: number; availableQty: number; shelfNo: string | null }
const emptyForm = { title: "", author: "", isbn: "", category: "", quantity: "1", shelfNo: "" }

export default function LibraryClient({ books: initial, schoolId }: { books: Book[]; schoolId: string }) {
  const [books, setBooks] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
      if (!res.ok) throw new Error((await res.json()).error)
      const book = await res.json()
      setBooks(prev => [...prev, book]); setOpen(false); setForm(emptyForm)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this book?")) return
    await fetch(`/api/library/${id}`, { method: "DELETE" })
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  const columns: Column<Book>[] = [
    { key: "title", label: "Title", render: b => <span className="font-medium text-gray-900">{b.title}</span> },
    { key: "author", label: "Author", render: b => b.author ?? "—" },
    { key: "isbn", label: "ISBN", render: b => b.isbn ?? "—" },
    { key: "category", label: "Category", render: b => b.category ?? "—" },
    { key: "shelfNo", label: "Shelf", render: b => b.shelfNo ?? "—" },
    { key: "quantity", label: "Qty", render: b => <span className="font-semibold">{b.availableQty}/{b.quantity}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Library" description={`${books.length} book${books.length !== 1 ? "s" : ""} catalogued`} action={
        <button onClick={() => { setOpen(true); setError(""); setForm(emptyForm) }} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Add Book</button>
      } />
      {books.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <Library className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No books yet</h2>
          <button onClick={() => setOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Book</button>
        </div>
      ) : (
        <DataTable columns={columns} data={books} keyField="id" searchPlaceholder="Search books…" searchKeys={["title", "author", "isbn"]} actions={(b) => (
          <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
        )} />
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">Add Book</h2><button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button></div>
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
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Add Book"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
    </div>
  )
}
