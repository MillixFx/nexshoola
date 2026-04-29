"use client"

import { useState } from "react"
import { Package, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatCurrency, cn } from "@/lib/utils"

type Item = { id: string; name: string; category: string | null; quantity: number; unit: string | null; unitPrice: number | null; supplier: string | null }
const emptyForm = { name: "", category: "", quantity: "", unit: "pcs", unitPrice: "", supplier: "" }

export default function InventoryClient({ items: initial, schoolId }: { items: Item[]; schoolId: string }) {
  const [items, setItems] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterLow, setFilterLow] = useState(false)

  function openAdd() { setEditing(null); setForm(emptyForm); setOpen(true) }
  function openEdit(i: Item) {
    setEditing(i)
    setForm({ name: i.name, category: i.category ?? "", quantity: String(i.quantity), unit: i.unit ?? "pcs", unitPrice: String(i.unitPrice ?? ""), supplier: i.supplier ?? "" })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/inventory/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        const updated = await res.json()
        setItems(prev => prev.map(i => i.id === editing.id ? { ...updated, category: updated.supplier ?? null } : updated))
      } else {
        const res = await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
        const item = await res.json()
        setItems(prev => [...prev, item])
      }
      setOpen(false); setForm(emptyForm); setEditing(null)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return
    await fetch(`/api/inventory/${id}`, { method: "DELETE" })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const LOW_STOCK = 5
  const lowStockCount = items.filter(i => i.quantity < LOW_STOCK).length
  const totalValue = items.reduce((s, i) => s + (i.quantity * (i.unitPrice ?? 0)), 0)

  const filtered = items
    .filter(i => !filterLow || i.quantity < LOW_STOCK)
    .filter(i => [i.name, i.category, i.supplier].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`${items.length} item${items.length !== 1 ? "s" : ""} · Est. value ${formatCurrency(totalValue)}`}
        action={
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        }
      />

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-indigo-700">{items.length}</p>
            <p className="text-xs font-semibold text-indigo-500 mt-0.5">Total Items</p>
          </div>
          <div className={cn("rounded-2xl p-4 text-center", lowStockCount > 0 ? "bg-red-50" : "bg-emerald-50")}>
            <p className={cn("text-2xl font-extrabold", lowStockCount > 0 ? "text-red-600" : "text-emerald-600")}>{lowStockCount}</p>
            <p className={cn("text-xs font-semibold mt-0.5", lowStockCount > 0 ? "text-red-500" : "text-emerald-500")}>Low Stock</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-700">{formatCurrency(totalValue)}</p>
            <p className="text-xs font-semibold text-amber-500 mt-0.5">Est. Total Value</p>
          </div>
        </div>
      )}

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{lowStockCount} item{lowStockCount !== 1 ? "s are" : " is"} low on stock (less than {LOW_STOCK} units)</p>
          <button onClick={() => setFilterLow(f => !f)} className={cn("ml-auto text-xs font-bold px-2 py-1 rounded-lg", filterLow ? "bg-red-600 text-white" : "border border-red-300 text-red-600")}>
            {filterLow ? "Show All" : "Show Low Stock"}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <Package className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No inventory items</h2>
          <p className="text-sm text-gray-500 mb-3">Track school supplies, equipment, and materials</p>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline">+ Add Item</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input
              className="w-full sm:w-64 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search items, categories…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No items found.</td></tr>
                ) : filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                    <td className="px-4 py-3 text-gray-500">{i.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("font-bold", i.quantity < LOW_STOCK ? "text-red-600" : "text-gray-900")}>
                        {i.quantity} {i.unit ?? ""}
                      </span>
                      {i.quantity < LOW_STOCK && <span className="ml-1 text-xs text-red-500">Low</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{i.unitPrice ? formatCurrency(i.unitPrice) : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{i.supplier ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(i)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(i.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">{filtered.length} of {items.length} items</div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Item" : "Add Item"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Item Name *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Exercise Books" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Category</label><input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Stationery" /></div>
                <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="pcs, reams…" /></div>
                <div><label className="label">Quantity *</label><input className="input" type="number" min="0" required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><label className="label">Unit Price (GH₵)</label><input className="input" type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} /></div>
              </div>
              <div><label className="label">Supplier</label><input className="input" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Item"}
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
