"use client"

import { useState } from "react"
import { Bus, Plus } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import { formatCurrency } from "@/lib/utils"

type Route = { id: string; routeName: string; vehicleNo: string | null; vehicleModel: string | null; driverName: string | null; driverPhone: string | null; capacity: number; fare: number | null }
const emptyForm = { routeName: "", vehicleNo: "", vehicleModel: "", driverName: "", driverPhone: "", capacity: "", fare: "" }

export default function TransportClient({ routes: initial, schoolId }: { routes: Route[]; schoolId: string }) {
  const [routes, setRoutes] = useState(initial)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/transport", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, schoolId }) })
    const route = await res.json()
    setRoutes(prev => [...prev, route]); setOpen(false); setForm(emptyForm); setSaving(false)
  }

  const columns: Column<Route>[] = [
    { key: "routeName", label: "Route", render: r => <span className="font-medium text-gray-900">{r.routeName}</span> },
    { key: "vehicleNo", label: "Vehicle No.", render: r => r.vehicleNo ?? "—" },
    { key: "vehicleModel", label: "Model", render: r => r.vehicleModel ?? "—" },
    { key: "driverName", label: "Driver", render: r => r.driverName ?? "—" },
    { key: "driverPhone", label: "Phone", render: r => r.driverPhone ?? "—" },
    { key: "capacity", label: "Capacity", render: r => String(r.capacity) },
    { key: "fare", label: "Fare", render: r => r.fare ? formatCurrency(r.fare) : "—" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Transport" description={`${routes.length} route${routes.length !== 1 ? "s" : ""}`} action={
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Add Route</button>
      } />
      {routes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm"><Bus className="w-10 h-10 text-indigo-300 mb-3" /><h2 className="font-bold text-gray-800 mb-1">No routes yet</h2><button onClick={() => setOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline mt-2">+ Add Route</button></div>
      ) : (
        <DataTable columns={columns} data={routes} keyField="id" searchPlaceholder="Search routes…" searchKeys={["routeName", "vehicleNo", "driverName"]} />
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-900">Add Route</h2><button onClick={() => setOpen(false)} className="text-gray-400 text-xl">×</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Route Name *</label><input className="input" required value={form.routeName} onChange={e => setForm(f => ({ ...f, routeName: e.target.value }))} placeholder="Accra — Adenta" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Vehicle No.</label><input className="input" value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value }))} placeholder="GR-1234-22" /></div>
                <div><label className="label">Vehicle Model</label><input className="input" value={form.vehicleModel} onChange={e => setForm(f => ({ ...f, vehicleModel: e.target.value }))} placeholder="Toyota Hiace" /></div>
                <div><label className="label">Driver Name</label><input className="input" value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} /></div>
                <div><label className="label">Driver Phone</label><input className="input" value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} /></div>
                <div><label className="label">Capacity</label><input className="input" type="number" min="0" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
                <div><label className="label">Fare (GH₵)</label><input className="input" type="number" min="0" value={form.fare} onChange={e => setForm(f => ({ ...f, fare: e.target.value }))} /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving…" : "Add Route"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style jsx global>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:.375rem}.input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.625rem .875rem;font-size:.875rem;outline:none}.input:focus{outline:2px solid #6366f1;border-color:#6366f1}`}</style>
    </div>
  )
}
