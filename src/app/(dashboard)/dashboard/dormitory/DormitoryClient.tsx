"use client"

import { useState, useMemo } from "react"
import { BedDouble, Plus, Pencil, Trash2, Users, ChevronLeft, Loader2, UserCheck, UserMinus } from "lucide-react"
import PageHeader from "@/components/dashboard/PageHeader"
import ConfirmModal from "@/components/dashboard/ConfirmModal"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────
type Bed = {
  id: string; bedNumber: string
  student: { id: string; user: { name: string } } | null
}
type Room = {
  id: string; roomNumber: string; capacity: number
  beds: Bed[]
}
type Dorm = {
  id: string; name: string; type: string; capacity: number; warden: string | null
  _count: { rooms: number }
  rooms: Room[]
}
type Student = { id: string; name: string; hasBed: boolean }

const emptyDormForm = { name: "", type: "BOYS", capacity: "", warden: "" }
const TYPE_COLORS: Record<string, string> = {
  BOYS: "bg-blue-50 text-blue-700",
  GIRLS: "bg-pink-50 text-pink-700",
  STAFF: "bg-gray-100 text-gray-700",
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DormitoryClient({
  dorms: initial, students, schoolId,
}: { dorms: Dorm[]; students: Student[]; schoolId: string }) {
  const [dorms, setDorms]               = useState(initial)
  const [selectedDorm, setSelectedDorm] = useState<Dorm | null>(null)

  // Dorm CRUD
  const [dormOpen, setDormOpen]         = useState(false)
  const [editDorm, setEditDorm]         = useState<Dorm | null>(null)
  const [dormForm, setDormForm]         = useState(emptyDormForm)
  const [dormSaving, setDormSaving]     = useState(false)

  // Room management
  const [addRoomOpen, setAddRoomOpen]   = useState(false)
  const [roomForm, setRoomForm]         = useState({ roomNumber: "", capacity: "4" })
  const [roomSaving, setRoomSaving]     = useState(false)
  const [roomError, setRoomError]       = useState("")
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null)

  // Bed assignment
  const [assigningBed, setAssigningBed] = useState<Bed | null>(null)
  const [selectedStudent, setSelectedStudent] = useState("")
  const [bedSaving, setBedSaving]       = useState(false)

  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // ── Dorm CRUD ──────────────────────────────────────────────────────────────
  function openAddDorm() { setEditDorm(null); setDormForm(emptyDormForm); setDormOpen(true) }
  function openEditDorm(d: Dorm) {
    setEditDorm(d)
    setDormForm({ name: d.name, type: d.type, capacity: String(d.capacity), warden: d.warden ?? "" })
    setDormOpen(true)
  }

  async function handleDormSubmit(e: React.FormEvent) {
    e.preventDefault(); setDormSaving(true)
    try {
      if (editDorm) {
        const res = await fetch(`/api/dormitory/${editDorm.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dormForm) })
        const updated = await res.json()
        setDorms(prev => prev.map(d => d.id === editDorm.id ? { ...d, ...updated } : d))
        if (selectedDorm?.id === editDorm.id) setSelectedDorm(prev => prev ? { ...prev, ...updated } : null)
      } else {
        const res = await fetch("/api/dormitory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...dormForm, schoolId }) })
        const dorm = await res.json()
        setDorms(prev => [...prev, { ...dorm, rooms: [] }])
      }
      setDormOpen(false); setEditDorm(null)
    } finally { setDormSaving(false) }
  }

  function handleDeleteDorm(id: string) {
    setConfirmModal({
      message: "Delete this hostel? All rooms and beds will be removed.",
      onConfirm: async () => {
        await fetch(`/api/dormitory/${id}`, { method: "DELETE" })
        setDorms(prev => prev.filter(d => d.id !== id))
        if (selectedDorm?.id === id) setSelectedDorm(null)
      },
    })
  }

  // ── Room management ────────────────────────────────────────────────────────
  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault(); if (!selectedDorm) return
    setRoomSaving(true); setRoomError("")
    try {
      const res = await fetch(`/api/dormitory/${selectedDorm.id}/rooms`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const updatedDorm = { ...selectedDorm, rooms: [...selectedDorm.rooms, data], _count: { rooms: selectedDorm._count.rooms + 1 } }
      setSelectedDorm(updatedDorm)
      setDorms(prev => prev.map(d => d.id === selectedDorm.id ? updatedDorm : d))
      setAddRoomOpen(false); setRoomForm({ roomNumber: "", capacity: "4" })
    } catch (err: any) { setRoomError(err.message) } finally { setRoomSaving(false) }
  }

  function handleDeleteRoom(roomId: string, roomNumber: string) {
    setConfirmModal({
      message: `Delete Room ${roomNumber}? All beds and assignments will be removed.`,
      onConfirm: async () => {
        setDeletingRoom(roomId)
        await fetch(`/api/dormitory/rooms/${roomId}`, { method: "DELETE" })
        if (selectedDorm) {
          const updated = { ...selectedDorm, rooms: selectedDorm.rooms.filter(r => r.id !== roomId), _count: { rooms: selectedDorm._count.rooms - 1 } }
          setSelectedDorm(updated)
          setDorms(prev => prev.map(d => d.id === selectedDorm.id ? updated : d))
        }
        setDeletingRoom(null)
      },
    })
  }

  // ── Bed assignment ─────────────────────────────────────────────────────────
  function openAssign(bed: Bed) {
    setAssigningBed(bed)
    setSelectedStudent(bed.student?.id ?? "")
  }

  async function handleAssign() {
    if (!assigningBed || !selectedDorm) return
    setBedSaving(true)
    try {
      const res = await fetch(`/api/dormitory/beds/${assigningBed.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudent || null }),
      })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error)

      // Update local state
      const updatedRooms = selectedDorm.rooms.map(room => ({
        ...room,
        beds: room.beds.map(bed =>
          bed.id === assigningBed.id ? { ...bed, student: updated.student } : bed
        ),
      }))
      const updatedDorm = { ...selectedDorm, rooms: updatedRooms }
      setSelectedDorm(updatedDorm)
      setDorms(prev => prev.map(d => d.id === selectedDorm.id ? updatedDorm : d))
      setAssigningBed(null)
    } catch (err: any) { alert(err.message) } finally { setBedSaving(false) }
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const totalCapacity = dorms.reduce((s, d) => s + d.capacity, 0)
  const totalRooms    = dorms.reduce((s, d) => s + d._count.rooms, 0)
  const totalOccupied = useMemo(() =>
    dorms.reduce((s, d) => s + d.rooms.reduce((rs, r) => rs + r.beds.filter(b => b.student).length, 0), 0),
    [dorms]
  )

  // Students not yet assigned (or the one currently assigned to this bed)
  const unassignedStudents = useMemo(() =>
    students.filter(s => !s.hasBed || s.id === assigningBed?.student?.id),
    [students, assigningBed]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={selectedDorm ? `${selectedDorm.name} — Rooms` : "Dormitory"}
        description={selectedDorm
          ? `${selectedDorm.rooms.length} room${selectedDorm.rooms.length !== 1 ? "s" : ""} · ${selectedDorm.rooms.reduce((s, r) => s + r.beds.filter(b => b.student).length, 0)} occupied`
          : `${dorms.length} hostel${dorms.length !== 1 ? "s" : ""} · ${totalOccupied}/${totalCapacity} beds occupied`
        }
        action={
          selectedDorm ? (
            <div className="flex gap-2">
              <button onClick={() => setSelectedDorm(null)} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" /> All Hostels
              </button>
              <button onClick={() => setAddRoomOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 shadow-sm">
                <Plus className="w-4 h-4" /> Add Room
              </button>
            </div>
          ) : (
            <button onClick={openAddDorm} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
              <Plus className="w-4 h-4" /> Add Hostel
            </button>
          )
        }
      />

      {/* ── Dorms Overview ── */}
      {!selectedDorm && (
        <>
          {dorms.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Hostels",  value: dorms.length,    color: "bg-indigo-50 text-indigo-700" },
                { label: "Total Rooms",    value: totalRooms,      color: "bg-emerald-50 text-emerald-700" },
                { label: "Beds Occupied",  value: `${totalOccupied}/${totalCapacity}`, color: "bg-amber-50 text-amber-700" },
              ].map(s => (
                <div key={s.label} className={cn("rounded-2xl p-4 text-center", s.color)}>
                  <p className="text-2xl font-extrabold">{s.value}</p>
                  <p className="text-xs font-semibold mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {dorms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
              <BedDouble className="w-10 h-10 text-indigo-300 mb-3" />
              <h2 className="font-bold text-gray-800 mb-1">No hostels yet</h2>
              <p className="text-sm text-gray-500 mb-3">Add your first hostel block to start managing dormitories</p>
              <button onClick={openAddDorm} className="text-sm font-semibold text-indigo-600 hover:underline">+ Add Hostel</button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dorms.map(d => {
                const occupied = d.rooms.reduce((s, r) => s + r.beds.filter(b => b.student).length, 0)
                const totalBeds = d.rooms.reduce((s, r) => s + r.beds.length, 0)
                const pct = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0
                return (
                  <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                          <BedDouble className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{d.name}</h3>
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", TYPE_COLORS[d.type] || "bg-gray-100 text-gray-600")}>
                            {d.type === "BOYS" ? "Boys" : d.type === "GIRLS" ? "Girls" : "Staff"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditDorm(d)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteDorm(d.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      {d.warden && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Warden</span>
                          <span className="font-medium text-gray-900">{d.warden}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rooms</span>
                        <span className="font-semibold text-indigo-600">{d._count.rooms}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Occupied</span>
                        <span className="font-semibold text-gray-900">{occupied}/{totalBeds} beds</span>
                      </div>
                    </div>

                    {/* Occupancy bar */}
                    <div className="mb-4">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-400" : "bg-emerald-500")}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{pct}% occupied</p>
                    </div>

                    <button
                      onClick={() => setSelectedDorm(d)}
                      className="w-full text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl py-2 hover:bg-indigo-50 transition-colors"
                    >
                      Manage Rooms →
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Rooms View ── */}
      {selectedDorm && (
        <div className="space-y-4">
          {selectedDorm.rooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
              <BedDouble className="w-10 h-10 text-gray-200 mb-3" />
              <h2 className="font-bold text-gray-800 mb-1">No rooms yet</h2>
              <p className="text-sm text-gray-500 mb-3">Add rooms and beds will be created automatically</p>
              <button onClick={() => setAddRoomOpen(true)} className="text-sm font-semibold text-indigo-600 hover:underline">+ Add Room</button>
            </div>
          ) : (
            selectedDorm.rooms.map(room => {
              const occupiedBeds = room.beds.filter(b => b.student).length
              return (
                <div key={room.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Room header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-gray-900">Room {room.roomNumber}</h3>
                      <span className="text-xs text-gray-500">{occupiedBeds}/{room.beds.length} beds occupied</span>
                    </div>
                    <button
                      onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                      disabled={deletingRoom === room.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40"
                    >
                      {deletingRoom === room.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Beds grid */}
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {room.beds.map(bed => (
                      <div
                        key={bed.id}
                        className={cn(
                          "rounded-xl border p-3 text-center cursor-pointer transition-all hover:shadow-sm",
                          bed.student
                            ? "border-indigo-200 bg-indigo-50"
                            : "border-dashed border-gray-200 bg-gray-50 hover:border-indigo-200"
                        )}
                        onClick={() => openAssign(bed)}
                      >
                        <BedDouble className={cn("w-5 h-5 mx-auto mb-1", bed.student ? "text-indigo-500" : "text-gray-300")} />
                        <p className="text-xs font-semibold text-gray-500">Bed {bed.bedNumber}</p>
                        {bed.student ? (
                          <p className="text-xs font-bold text-indigo-700 truncate mt-0.5">{bed.student.user.name}</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">Empty</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Add Hostel Modal ── */}
      {dormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editDorm ? "Edit Hostel" : "Add Hostel"}</h2>
              <button onClick={() => setDormOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleDormSubmit} className="p-6 space-y-4">
              <div><label className="label">Hostel Name *</label><input className="input" required value={dormForm.name} onChange={e => setDormForm(f => ({ ...f, name: e.target.value }))} placeholder="Boys Block A" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={dormForm.type} onChange={e => setDormForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="BOYS">Boys</option>
                    <option value="GIRLS">Girls</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>
                <div><label className="label">Total Capacity (beds)</label><input className="input" type="number" min="0" value={dormForm.capacity} onChange={e => setDormForm(f => ({ ...f, capacity: e.target.value }))} /></div>
              </div>
              <div><label className="label">Warden Name</label><input className="input" value={dormForm.warden} onChange={e => setDormForm(f => ({ ...f, warden: e.target.value }))} placeholder="Mr. Kwame Asante" /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setDormOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={dormSaving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {dormSaving ? "Saving…" : editDorm ? "Save Changes" : "Add Hostel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Room Modal ── */}
      {addRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Room</h2>
              <button onClick={() => setAddRoomOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleAddRoom} className="p-6 space-y-4">
              {roomError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{roomError}</div>}
              <div><label className="label">Room Number *</label><input className="input" required value={roomForm.roomNumber} onChange={e => setRoomForm(f => ({ ...f, roomNumber: e.target.value }))} placeholder="101" /></div>
              <div>
                <label className="label">Number of Beds</label>
                <input className="input" type="number" min="1" max="20" value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))} />
                <p className="text-xs text-gray-400 mt-1">Beds will be created automatically</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAddRoomOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={roomSaving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60">
                  {roomSaving ? "Adding…" : "Add Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Bed Modal ── */}
      {assigningBed && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {assigningBed.student ? "Reassign Bed" : "Assign Student"} — Bed {assigningBed.bedNumber}
              </h2>
              <button onClick={() => setAssigningBed(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              {assigningBed.student && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                  <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <p className="text-sm text-indigo-700">Currently: <strong>{assigningBed.student.user.name}</strong></p>
                </div>
              )}
              <div>
                <label className="label">Assign to Student</label>
                <select className="input" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                  <option value="">— Leave Empty —</option>
                  {unassignedStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {unassignedStudents.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">All students already have beds assigned.</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAssigningBed(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                {assigningBed.student && (
                  <button
                    type="button"
                    onClick={() => { setSelectedStudent(""); handleAssign() }}
                    disabled={bedSaving}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-4 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-60"
                  >
                    <UserMinus className="w-3.5 h-3.5" /> Unassign
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={bedSaving || (!selectedStudent && !assigningBed.student)}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {bedSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  {bedSaving ? "Saving…" : "Assign"}
                </button>
              </div>
            </div>
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
