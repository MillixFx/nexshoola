"use client"

import { useState } from "react"
import { Banknote, Plus, Pencil, Trash2, Printer, Check, X, Eye } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import { formatCurrency, cn } from "@/lib/utils"

type LineItem = { name: string; amount: number }
type Payslip = {
  id: string; teacherId: string; teacherName: string; month: number; year: number
  basicSalary: number; allowances: LineItem[]; deductions: LineItem[]
  netPay: number; notes: string | null; status: string
}
type Teacher = { id: string; name: string; designation: string | null; department: string | null }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  DRAFT:  { label: "Draft",  color: "bg-gray-100 text-gray-600 border-gray-200" },
  ISSUED: { label: "Issued", color: "bg-blue-50 text-blue-700 border-blue-200" },
  PAID:   { label: "Paid",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
}

const now = new Date()
const emptyForm = () => ({
  teacherId: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()),
  basicSalary: "", allowances: [{ name: "Housing Allowance", amount: "" }] as { name: string; amount: string }[],
  deductions: [{ name: "SSNIT (5.5%)", amount: "" }] as { name: string; amount: string }[],
  notes: "",
})

export default function PayrollClient({ payslips: initial, teachers, schoolId, schoolName }: {
  payslips: Payslip[]; teachers: Teacher[]; schoolId: string; schoolName: string
}) {
  const [payslips, setPayslips] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Payslip | null>(null)
  const [viewing, setViewing] = useState<Payslip | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()))

  function openAdd() { setEditing(null); setForm(emptyForm()); setError(""); setOpen(true) }
  function openEdit(p: Payslip) {
    setEditing(p)
    setForm({
      teacherId: p.teacherId, month: String(p.month), year: String(p.year),
      basicSalary: String(p.basicSalary),
      allowances: p.allowances.map(a => ({ name: a.name, amount: String(a.amount) })),
      deductions: p.deductions.map(d => ({ name: d.name, amount: String(d.amount) })),
      notes: p.notes ?? "",
    })
    setError(""); setOpen(true)
  }

  function addLineItem(key: "allowances" | "deductions") {
    setForm(f => ({ ...f, [key]: [...f[key], { name: "", amount: "" }] }))
  }
  function removeLineItem(key: "allowances" | "deductions", i: number) {
    setForm(f => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }))
  }
  function updateLineItem(key: "allowances" | "deductions", i: number, field: "name" | "amount", val: string) {
    setForm(f => ({ ...f, [key]: f[key].map((item, idx) => idx === i ? { ...item, [field]: val } : item) }))
  }

  const formAllowances = form.allowances.map(a => ({ name: a.name, amount: Number(a.amount) || 0 }))
  const formDeductions = form.deductions.map(d => ({ name: d.name, amount: Number(d.amount) || 0 }))
  const formBasic = Number(form.basicSalary) || 0
  const formNet = formBasic + formAllowances.reduce((s, a) => s + a.amount, 0) - formDeductions.reduce((s, d) => s + d.amount, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    try {
      const body = { schoolId, teacherId: form.teacherId, month: Number(form.month), year: Number(form.year), basicSalary: formBasic, allowances: formAllowances, deductions: formDeductions, notes: form.notes }
      if (editing) {
        const res = await fetch(`/api/payroll/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setPayslips(prev => prev.map(p => p.id === editing.id ? mapPayslip(updated) : p))
      } else {
        const res = await fetch("/api/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (!res.ok) throw new Error((await res.json()).error)
        const created = await res.json()
        setPayslips(prev => [mapPayslip(created), ...prev])
      }
      setOpen(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: string) {
    const p = payslips.find(p => p.id === id)!
    const res = await fetch(`/api/payroll/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, status }) })
    const updated = await res.json()
    setPayslips(prev => prev.map(p => p.id === id ? mapPayslip(updated) : p))
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this payslip?")) return
    await fetch(`/api/payroll/${id}`, { method: "DELETE" })
    setPayslips(prev => prev.filter(p => p.id !== id))
  }

  function mapPayslip(raw: any): Payslip {
    return { ...raw, teacherName: raw.teacher?.user?.name ?? raw.teacherName, allowances: raw.allowances ?? [], deductions: raw.deductions ?? [] }
  }

  const years = [...new Set(payslips.map(p => p.year))].sort((a, b) => b - a)
  if (!years.includes(now.getFullYear())) years.unshift(now.getFullYear())
  const filtered = payslips.filter(p => String(p.year) === filterYear)
  const totalPaid = filtered.filter(p => p.status === "PAID").reduce((s, p) => s + p.netPay, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description={`${payslips.length} payslip${payslips.length !== 1 ? "s" : ""} · ${teachers.length} staff`}
        action={
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
            <Plus className="w-4 h-4" /> Generate Payslip
          </button>
        }
      />

      {/* Stats */}
      {payslips.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-indigo-700">{teachers.length}</p>
            <p className="text-xs font-semibold text-indigo-500 mt-0.5">Total Staff</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-700">{filtered.length}</p>
            <p className="text-xs font-semibold text-amber-500 mt-0.5">Payslips ({filterYear})</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-700">{formatCurrency(totalPaid)}</p>
            <p className="text-xs font-semibold text-emerald-500 mt-0.5">Paid This Year</p>
          </div>
        </div>
      )}

      {payslips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
          <Banknote className="w-10 h-10 text-indigo-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No payslips yet</h2>
          <p className="text-sm text-gray-500 mb-3">Generate monthly payslips for your teaching staff</p>
          <button onClick={openAdd} className="text-sm font-semibold text-indigo-600 hover:underline">+ Generate Payslip</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-gray-400">{filtered.length} payslip{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Basic</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Allowances</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Deductions</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Net Pay</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No payslips for {filterYear}.</td></tr>
                ) : filtered.map(p => {
                  const cfg = STATUS_CFG[p.status] || STATUS_CFG.DRAFT
                  const totalAllow = p.allowances.reduce((s, a) => s + a.amount, 0)
                  const totalDeduct = p.deductions.reduce((s, d) => s + d.amount, 0)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.teacherName}</td>
                      <td className="px-4 py-3 text-gray-600">{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(p.basicSalary)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">+{formatCurrency(totalAllow)}</td>
                      <td className="px-4 py-3 text-red-500 font-medium">-{formatCurrency(totalDeduct)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(p.netPay)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", cfg.color)}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setViewing(p)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="View & Print"><Eye className="w-3.5 h-3.5" /></button>
                          {p.status === "DRAFT" && <button onClick={() => updateStatus(p.id, "ISSUED")} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Mark Issued"><Check className="w-3.5 h-3.5" /></button>}
                          {p.status === "ISSUED" && <button onClick={() => updateStatus(p.id, "PAID")} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Mark Paid"><Banknote className="w-3.5 h-3.5" /></button>}
                          <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Payslip" : "Generate Payslip"}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

              {/* Staff + Period */}
              <div>
                <label className="label">Staff Member *</label>
                <select className="input" required value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}>
                  <option value="">— Select staff —</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}{t.designation ? ` — ${t.designation}` : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Month *</label>
                  <select className="input" required value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year *</label>
                  <input className="input" type="number" required min="2020" max="2099" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
                </div>
              </div>

              {/* Basic Salary */}
              <div>
                <label className="label">Basic Salary (GH₵) *</label>
                <input className="input" type="number" min="0" step="0.01" required value={form.basicSalary} onChange={e => setForm(f => ({ ...f, basicSalary: e.target.value }))} placeholder="2000.00" />
              </div>

              {/* Allowances */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Allowances</label>
                  <button type="button" onClick={() => addLineItem("allowances")} className="text-xs text-indigo-600 font-semibold hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {form.allowances.map((a, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input flex-1" placeholder="e.g. Housing Allowance" value={a.name} onChange={e => updateLineItem("allowances", i, "name", e.target.value)} />
                      <input className="input w-28" type="number" min="0" step="0.01" placeholder="0.00" value={a.amount} onChange={e => updateLineItem("allowances", i, "amount", e.target.value)} />
                      <button type="button" onClick={() => removeLineItem("allowances", i)} className="text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Deductions</label>
                  <button type="button" onClick={() => addLineItem("deductions")} className="text-xs text-indigo-600 font-semibold hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {form.deductions.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input flex-1" placeholder="e.g. SSNIT (5.5%)" value={d.name} onChange={e => updateLineItem("deductions", i, "name", e.target.value)} />
                      <input className="input w-28" type="number" min="0" step="0.01" placeholder="0.00" value={d.amount} onChange={e => updateLineItem("deductions", i, "amount", e.target.value)} />
                      <button type="button" onClick={() => removeLineItem("deductions", i)} className="text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Net Pay preview */}
              <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-indigo-700">Net Pay</span>
                <span className="text-xl font-extrabold text-indigo-700">{formatCurrency(formNet)}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input resize-none min-h-[60px]" placeholder="e.g. Includes performance bonus" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Print View */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 no-print">
              <h2 className="font-bold text-gray-900">Payslip Preview</h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700">
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600 text-xl px-2">×</button>
              </div>
            </div>

            {/* Payslip document */}
            <div id="payslip-print" className="p-8 space-y-6">
              {/* Header */}
              <div className="text-center border-b-2 border-indigo-600 pb-4">
                <h1 className="text-2xl font-extrabold text-indigo-700">{schoolName}</h1>
                <p className="text-sm text-gray-500 mt-1">PAYSLIP</p>
                <p className="text-sm font-semibold text-gray-700 mt-0.5">{MONTHS[viewing.month - 1]} {viewing.year}</p>
              </div>

              {/* Employee info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Employee Name</p>
                  <p className="font-bold text-gray-900">{viewing.teacherName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Pay Period</p>
                  <p className="font-bold text-gray-900">{MONTHS[viewing.month - 1]} {viewing.year}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-bold text-gray-900 capitalize">{viewing.status}</p>
                </div>
              </div>

              {/* Earnings & Deductions */}
              <div className="grid grid-cols-2 gap-6">
                {/* Earnings */}
                <div>
                  <h3 className="font-bold text-gray-800 text-sm mb-3 pb-1 border-b border-gray-200">EARNINGS</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Basic Salary</span>
                      <span className="font-semibold">{formatCurrency(viewing.basicSalary)}</span>
                    </div>
                    {viewing.allowances.map((a, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{a.name}</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(a.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1">
                      <span>Gross Pay</span>
                      <span>{formatCurrency(viewing.basicSalary + viewing.allowances.reduce((s, a) => s + a.amount, 0))}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="font-bold text-gray-800 text-sm mb-3 pb-1 border-b border-gray-200">DEDUCTIONS</h3>
                  <div className="space-y-2">
                    {viewing.deductions.length === 0 ? (
                      <p className="text-sm text-gray-400">No deductions</p>
                    ) : viewing.deductions.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{d.name}</span>
                        <span className="font-semibold text-red-500">{formatCurrency(d.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-1">
                      <span>Total Deductions</span>
                      <span className="text-red-500">{formatCurrency(viewing.deductions.reduce((s, d) => s + d.amount, 0))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-indigo-600 text-white rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold opacity-80">NET PAY</p>
                  <p className="text-xs opacity-60">{MONTHS[viewing.month - 1]} {viewing.year}</p>
                </div>
                <p className="text-3xl font-extrabold">{formatCurrency(viewing.netPay)}</p>
              </div>

              {/* Notes */}
              {viewing.notes && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                  <span className="font-semibold">Notes: </span>{viewing.notes}
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-8 text-xs text-gray-400">
                <div>
                  <p className="font-semibold text-gray-700 mb-6">Employee Signature</p>
                  <div className="border-b border-gray-300 mb-1" />
                  <p>{viewing.teacherName}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 mb-6">Authorized By</p>
                  <div className="border-b border-gray-300 mb-1" />
                  <p>{schoolName}</p>
                </div>
              </div>
              <p className="text-center text-xs text-gray-300">Generated by NexSchoola · {schoolName}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .label { display:block; font-size:.75rem; font-weight:500; color:#374151; margin-bottom:.375rem; }
        .input { width:100%; border:1px solid #e5e7eb; border-radius:.75rem; padding:.625rem .875rem; font-size:.875rem; outline:none; }
        .input:focus { outline:2px solid #6366f1; border-color:#6366f1; }
        @media print {
          body > * { display: none !important; }
          #payslip-print { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
