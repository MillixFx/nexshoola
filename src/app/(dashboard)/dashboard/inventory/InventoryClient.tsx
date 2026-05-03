"use client"

import { useState } from "react"
import { Package, Plus, Pencil, Trash2, AlertTriangle, ArrowLeftRight, Loader2, X, RotateCcw, ClipboardList } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import ConfirmModal from "@/components/dashboard/ConfirmModal"

type Item = {
  id: string
  name: string
  category: string | null
  quantity: number
  unit: string | null
  unitPrice: number | null
  supplier: string | null
}

type Issue = {
  id: string
  itemId: string
  itemName: string
  itemUnit: string | null
  recipientId: string
  recipientType: string
  quantity: number
  issueDate: string
  status: string
}

const emptyForm = { name: "", category: "", quantity: "", unit: "pcs", unitPrice: "", supplier: "" }
const emptyIssueForm = { itemId: "", recipientId: "", recipientType: "STUDENT", quantity: "1" }

const TABS = ["Items", "Issues"] as const

export default function InventoryClient({
  items: initial,
  issues: initialIssues,
  schoolId,
}: {
  items: Item[]
  issues: Issue[]
  schoolId: string
}) {
  const [tab, setTab] = useState<typeof TABS[number]>("Items")
  const [items, setItems] = useState(initial)
  const [issues, setIssues] = useState(initialIssues)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterLow, setFilterLow] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issueForm, setIssueForm] = useState(emptyIssueForm)
  const [issueSaving, setIssueSaving] = useState(false)
  const [issueError, setIssueError] = useState("")

  // Return loading
  const [returningId, setReturningId] = useState<string | null>(null)

  function openAdd() { setEditing(null); setForm(emptyForm); setOpen(true) }
  function openEdit(i: Item) {
    setEditing(i)
    setForm({
      name: i.name,
      category: i.category ?? "",
      quantity: String(i.quantity),
      unit: i.unit ?? "pcs",
      unitPrice: String(i.unitPrice ?? ""),
      supplier: i.supplier ?? "",
    })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/inventory/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        const updated = await res.json()
        setItems(prev => prev.map(i => i.id === editing.id ? { ...updated, category: updated.category?.name ?? null } : i))
      } else {
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, schoolId }),
        })
        const item = await res.json()
        setItems(prev => [...prev, { ...item, category: item.category?.name ?? null }])
      }
      setOpen(false)
      setForm(emptyForm)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(id: string) {
    setConfirmModal({
      message: "Delete this item?",
      onConfirm: async () => {
        await fetch(`/api/inventory/${id}`, { method: "DELETE" })
        setItems(prev => prev.filter(i => i.id !== id))
      },
    })
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault()
    setIssueSaving(true)
    setIssueError("")
    try {
      const res = await fetch("/api/inventory/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issueForm),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "Failed to issue item")
      }
      const newIssue = await res.json()
      const item = items.find(i => i.id === issueForm.itemId)
      setIssues(prev => [{
        id: newIssue.id,
        itemId: newIssue.itemId,
        itemName: newIssue.item?.name ?? item?.name ?? "—",
        itemUnit: newIssue.item?.unit ?? item?.unit ?? null,
        recipientId: newIssue.recipientId,
        recipientType: newIssue.recipientType,
        quantity: newIssue.quantity,
        issueDate: newIssue.issueDate,
        status: newIssue.status,
      }, ...prev])
      // Decrement local quantity
      setItems(prev => prev.map(i =>
        i.id === issueForm.itemId ? { ...i, quantity: i.quantity - Number(issueForm.quantity) } : i
      ))
      setShowIssueModal(false)
      setIssueForm(emptyIssueForm)
    } catch (err: any) {
      setIssueError(err.message)
    } finally {
      setIssueSaving(false)
    }
  }

  async function handleReturn(issueId: string) {
    setReturningId(issueId)
    try {
      const res = await fetch(`/api/inventory/issues/${issueId}`, { method: "PUT" })
      if (!res.ok) return
      const updated = await res.json()
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: "PAID" } : i))
      // Increment local quantity
      const issue = issues.find(i => i.id === issueId)
      if (issue) {
        setItems(prev => prev.map(i =>
          i.id === issue.itemId ? { ...i, quantity: i.quantity + issue.quantity } : i
        ))
      }
    } finally {
      setReturningId(null)
    }
  }

  const LOW_STOCK = 5
  const lowStockCount = items.filter(i => i.quantity < LOW_STOCK).length
  const totalValue = items.reduce((s, i) => s + (i.quantity * (i.unitPrice ?? 0)), 0)

  const filtered = items
    .filter(i => !filterLow || i.quantity < LOW_STOCK)
    .filter(i => [i.name, i.category, i.supplier].some(v => v?.toLowerCase().includes(search.toLowerCase())))

  const activeIssues = issues.filter(i => i.status !== "PAID")
  const returnedIssues = issues.filter(i => i.status === "PAID")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`${items.length} item${items.length !== 1 ? "s" : ""} · Est. value ${formatCurrency(totalValue)}`}
        action={
          <div className="flex gap-2">
            {tab === "Issues" && (
              <button
                onClick={() => { setShowIssueModal(true); setIssueError(""); setIssueForm(emptyIssueForm) }}
                className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-700 shadow-sm"
              >
                <ArrowLeftRight className="w-4 h-4" /> Issue Item
              </button>
            )}
            {tab === "Items" && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg flex items-center gap-1.5",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {t === "Items" ? <Package className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
            {t}
            {t === "Issues" && activeIssues.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">{activeIssues.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── ITEMS TAB ── */}
      {tab === "Items" && (
        <>
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
              <p className="text-sm text-red-700">
                {lowStockCount} item{lowStockCount !== 1 ? "s are" : " is"} low on stock (less than {LOW_STOCK} units)
              </p>
              <button
                onClick={() => setFilterLow(f => !f)}
                className={cn("ml-auto text-xs font-bold px-2 py-1 rounded-lg", filterLow ? "bg-red-600 text-white" : "border border-red-300 text-red-600")}
              >
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
        </>
      )}

      {/* ── ISSUES TAB ── */}
      {tab === "Issues" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-indigo-700">{issues.length}</p>
              <p className="text-xs font-semibold text-indigo-500 mt-0.5">Total Issued</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-amber-700">{activeIssues.length}</p>
              <p className="text-xs font-semibold text-amber-500 mt-0.5">Active Issues</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-emerald-700">{returnedIssues.length}</p>
              <p className="text-xs font-semibold text-emerald-500 mt-0.5">Returned</p>
            </div>
          </div>

          {issues.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
              <ClipboardList className="w-10 h-10 text-indigo-300 mb-3" />
              <h2 className="font-bold text-gray-800 mb-1">No issues yet</h2>
              <p className="text-sm text-gray-500 mb-3">Issue items to students or employees and track returns</p>
              <button
                onClick={() => { setShowIssueModal(true); setIssueError(""); setIssueForm(emptyIssueForm) }}
                className="text-sm font-semibold text-indigo-600 hover:underline"
              >
                + Issue Item
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Recipient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Issued</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {issues.map(issue => (
                      <tr key={issue.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{issue.itemName}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{issue.recipientId}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
                            issue.recipientType === "STUDENT" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                          )}>
                            {issue.recipientType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-semibold">
                          {issue.quantity} {issue.itemUnit ?? ""}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(issue.issueDate)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full",
                            issue.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {issue.status === "PAID" ? "Returned" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {issue.status !== "PAID" ? (
                            <button
                              onClick={() => handleReturn(issue.id)}
                              disabled={returningId === issue.id}
                              className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full hover:bg-emerald-100 disabled:opacity-60 mx-auto"
                            >
                              {returningId === issue.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                              Return
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-500 font-semibold">Done</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add/Edit Item Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
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

      {/* ── Issue Item Modal ── */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Issue Item</h2>
              <button onClick={() => setShowIssueModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleIssue} className="p-6 space-y-4">
              {issueError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{issueError}</div>
              )}
              <div>
                <label className="label">Item *</label>
                <select className="input" required value={issueForm.itemId} onChange={e => setIssueForm(f => ({ ...f, itemId: e.target.value }))}>
                  <option value="">— Select item —</option>
                  {items.filter(i => i.quantity > 0).map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Stock: {i.quantity} {i.unit ?? ""})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Recipient Type *</label>
                <select className="input" value={issueForm.recipientType} onChange={e => setIssueForm(f => ({ ...f, recipientType: e.target.value }))}>
                  <option value="STUDENT">Student</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>
              <div>
                <label className="label">Recipient Name / ID *</label>
                <input
                  className="input"
                  required
                  placeholder={issueForm.recipientType === "STUDENT" ? "Student name or ID" : "Employee name or ID"}
                  value={issueForm.recipientId}
                  onChange={e => setIssueForm(f => ({ ...f, recipientId: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Quantity *</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  required
                  value={issueForm.quantity}
                  onChange={e => setIssueForm(f => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowIssueModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={issueSaving} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                  {issueSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {issueSaving ? "Issuing…" : "Issue Item"}
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
