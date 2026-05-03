"use client"

import { useState } from "react"
import { Plus, Trash2, Pencil, Briefcase, X, CheckCircle2 } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import DataTable, { Column } from "@/components/dashboard/DataTable"
import ConfirmModal from "@/components/dashboard/ConfirmModal"
import { cn } from "@/lib/utils"

type Employee = {
  id: string
  employeeId: string | null
  role: string | null
  department: string | null
  gender: string | null
  address: string | null
  photo: string | null
  joiningDate: string
  isActive: boolean
  user: { name: string; email: string; phone: string | null; isActive: boolean; role: string }
}

const ROLES = ["ADMIN", "HEADMASTER", "ACCOUNTANT", "LIBRARIAN", "HOSTEL_MANAGER", "HR", "DRIVER"]
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator", HEADMASTER: "Headmaster", ACCOUNTANT: "Accountant",
  LIBRARIAN: "Librarian", HOSTEL_MANAGER: "Hostel Manager", HR: "HR Officer", DRIVER: "Driver",
}
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-50 text-purple-700", HEADMASTER: "bg-rose-50 text-rose-700",
  ACCOUNTANT: "bg-indigo-50 text-indigo-700", LIBRARIAN: "bg-cyan-50 text-cyan-700",
  HOSTEL_MANAGER: "bg-teal-50 text-teal-700", HR: "bg-amber-50 text-amber-700",
  DRIVER: "bg-slate-50 text-slate-700",
}

const emptyForm = {
  name: "", email: "", phone: "", employeeId: "", role: "ADMIN",
  department: "", gender: "", address: "", joiningDate: "",
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function HRClient({ employees: initial, canDelete }: { employees: Employee[]; canDelete: boolean }) {
  const [employees, setEmployees] = useState(initial)
  const [addOpen, setAddOpen] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)

  function openAdd() { setForm(emptyForm); setError(""); setAddOpen(true) }
  function openEdit(e: Employee) {
    setEditEmp(e)
    setForm({
      name: e.user.name, email: e.user.email, phone: e.user.phone || "",
      employeeId: e.employeeId || "", role: e.user.role || "ADMIN",
      department: e.department || "", gender: e.gender || "",
      address: e.address || "",
      joiningDate: e.joiningDate ? e.joiningDate.slice(0, 10) : "",
    })
    setError("")
  }

  async function handleAdd(ev: React.FormEvent) {
    ev.preventDefault(); setSaving(true); setError("")
    try {
      const res = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmployees(prev => [data, ...prev])
      setAddOpen(false)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  async function handleEdit(ev: React.FormEvent) {
    ev.preventDefault(); if (!editEmp) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/employees/${editEmp.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmployees(prev => prev.map(e => e.id === data.id ? data : e))
      setEditEmp(null)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  function handleDelete(id: string, name: string) {
    setConfirm({
      message: `Delete ${name}? This cannot be undone.`,
      onConfirm: async () => {
        const res = await fetch(`/api/employees/${id}`, { method: "DELETE" })
        if (res.ok) setEmployees(prev => prev.filter(e => e.id !== id))
        else alert("Failed to delete employee")
      },
    })
  }

  const columns: Column<Employee>[] = [
    {
      key: "user",
      label: "Employee",
      primary: true,
      render: e => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
            {initials(e.user.name)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{e.user.name}</p>
            <p className="text-xs text-gray-400">{e.user.email}</p>
          </div>
        </div>
      ),
    },
    { key: "employeeId", label: "ID", render: e => <span className="text-sm text-gray-500 font-mono">{e.employeeId || "—"}</span> },
    {
      key: "role",
      label: "Role",
      render: e => (
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", ROLE_COLORS[e.user.role] || "bg-gray-100 text-gray-600")}>
          {ROLE_LABELS[e.user.role] || e.user.role}
        </span>
      ),
    },
    { key: "department", label: "Department", render: e => <span className="text-sm text-gray-600">{e.department || "—"}</span> },
    { key: "phone",      label: "Phone",      render: e => <span className="text-sm text-gray-600">{e.user.phone || "—"}</span> },
    {
      key: "joiningDate",
      label: "Joined",
      render: e => <span className="text-xs text-gray-500">{new Date(e.joiningDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>,
    },
    {
      key: "isActive",
      label: "Status",
      render: e => (
        <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", e.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
          {e.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ]

  const EmployeeForm = ({ onSubmit, title }: { onSubmit: (e: React.FormEvent) => void; title: string }) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={() => { setAddOpen(false); setEditEmp(null) }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Mensah" />
            </div>
            <div>
              <label className="label">Employee ID</label>
              <input className="input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} placeholder="EMP001" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0241234567" />
            </div>
            <div className="col-span-2">
              <label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="employee@school.com" />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Finance, Admin…" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">— Select —</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Joining Date</label>
              <input type="date" className="input" value={form.joiningDate} onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Default password: <code className="bg-gray-100 px-1 rounded">changeme123</code> — staff should change on first login.</p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setAddOpen(false); setEditEmp(null) }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-60 transition-colors">
              {saving ? "Saving…" : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR & Employees"
        description={`${employees.length} employee${employees.length !== 1 ? "s" : ""} on record`}
        action={
          <button onClick={openAdd} className="flex items-center gap-2 bg-amber-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-amber-600 shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        }
      />

      {employees.length === 0 ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-14 flex flex-col items-center text-center shadow-sm">
          <Briefcase className="w-12 h-12 text-amber-300 mb-3" />
          <h2 className="font-bold text-gray-800 mb-1">No employees yet</h2>
          <p className="text-sm text-gray-500 mb-4">Add non-teaching staff to track their records</p>
          <button onClick={openAdd} className="text-sm font-semibold text-amber-600 hover:underline">+ Add Employee</button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          keyField="id"
          viewKey="hr-employees"
          searchPlaceholder="Search employees…"
          searchKeys={["user", "department", "employeeId"] as any}
          actions={e => (
            <div className="flex gap-1 justify-end">
              <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {canDelete && (
                <button onClick={() => handleDelete(e.id, e.user.name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {addOpen  && <EmployeeForm onSubmit={handleAdd}  title="Add Employee" />}
      {editEmp  && <EmployeeForm onSubmit={handleEdit} title="Save Changes"  />}

      <ConfirmModal
        open={!!confirm}
        message={confirm?.message ?? ""}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null) }}
        onCancel={() => setConfirm(null)}
      />

      <style jsx global>{`
        .label { display:block; font-size:0.75rem; font-weight:600; color:#374151; margin-bottom:0.375rem; }
        .input { width:100%; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0.625rem 0.875rem; font-size:0.875rem; outline:none; }
        .input:focus { border-color:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,0.15); }
      `}</style>
    </div>
  )
}
