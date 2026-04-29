"use client"

import { useState } from "react"
import { Package, Plus } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import { formatCurrency, cn } from "@/lib/utils"

type Item = { id: string; name: string; category: string | null; quantity: number; unit: string | null; unitPrice: number | null; supplier: string | null }
const emptyForm = { name: "", category: "", quantity: "", unit: "pcs", unitPrice: "", supplier: "" }

export default function InventoryClient({ items: initial, schoolId }: { items: Item[]; schoolId: string }) {
  const [items, setItems] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
    const item = await res.json()
    setItems(prev => [...prev, item]); setOpen(false); setForm(emptyForm); setSaving(false)
  }

  const columns: Column<Item>[] = [
    { key: "name", label: "Item", render: i => <span className="font-medium text-gray-900">{i.name}</span> },
    { key: "category", label: "Category", render: i => i.category ?? "—" },
    { key: "quantity", label: "Qty", render: i => <span className={cn("font-bold", i.quantity < 5 ? "text-red-600" : "text-gray-900")}>{i.quantity} {i.unit ?? ""}</span> },
    { key: "unitPrice", label: "Unit Price", render: i => i.unitPrice ? formatCurrency(i.unitPrice) : "—" },
    { key: "supplier", label: "Supplier", render: i => i.supplier ?? "—" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description={`${items.length} item${items.length !== 1 ? "s" : ""} in stock`} action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Add Item</button>
      } />
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm"><Package className="w-10 h-10 text-indigo-300 mb-3" /><h2 className="font-bold text-gray-800 mb-1">No inventory items</h2><button onClick={() => setOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Item</button></div>
      ) : (
        <DataTable columns={columns} data={items} keyField="id" searchPlaceholder="Search items…" searchKeys={["name", "category", "supplier"]} />
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">Add Item</h2><button onClick={() => setOpen(false)} className="text-gray-400 text-xl">×</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Item Name *</label><input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Exercise Books" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Category</label><input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Stationery" /></div>
                <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="pcs, reams…" /></div>
                <div><label className="label">Quantity</label><input className="input" type="number" min="0" required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></div>
                <div><label className="label">Unit Price (GH₵)</label><input className="input" type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} /></div>
              </div>
              <div><label className="label">Supplier</label><input className="input" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Add Item"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
    </div>
  )
}
