"use client"

import { useRef } from "react"
import { Printer } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SchoolInfo = {
  name: string
  logo?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  headmaster?: string | null
}

export type StudentCardData = {
  type: "student"
  name: string
  photo?: string | null
  className?: string | null       // "JHS 1 – Gold"
  studentId?: string | null
  rollNumber?: string | null
  dateOfBirth?: string | Date | null
  gender?: string | null
  admissionDate?: string | Date | null
  bloodGroup?: string | null
  nationality?: string | null
}

export type StaffCardData = {
  type: "staff"
  name: string
  photo?: string | null
  role?: string | null            // "TEACHER", "ADMIN", …
  staffId?: string | null
  designation?: string | null
  department?: string | null
  qualification?: string | null
  joiningDate?: string | Date | null
  phone?: string | null
  email?: string | null
}

interface IDCardProps {
  data: StudentCardData | StaffCardData
  school: SchoolInfo
  onClose: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d?: string | Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function roleLabel(role?: string | null) {
  if (!role) return "Staff"
  const map: Record<string, string> = {
    ADMIN: "Administrator", HEADMASTER: "Headmaster", TEACHER: "Teacher",
    ACCOUNTANT: "Accountant", LIBRARIAN: "Librarian",
    HOSTEL_MANAGER: "Hostel Manager", HR: "HR Officer", DRIVER: "Driver",
  }
  return map[role] ?? role
}

// ─── Photo / Initials avatar (inline styles only) ─────────────────────────────

function Avatar({ name, photo, size }: { name: string; photo?: string | null; size: number }) {
  const radius = Math.round(size * 0.1)
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{
          width: size, height: size, objectFit: "cover",
          borderRadius: radius, border: "3px solid #e0e7ff",
          display: "block",
        }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      border: "3px solid #e0e7ff",
      background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      color: "white", display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 900,
      fontSize: Math.round(size * 0.32), letterSpacing: 1,
    }}>
      {initials(name)}
    </div>
  )
}

// ─── The actual card face (all inline styles — required for print serialisation) ──

function CardFace({ data, school }: { data: StudentCardData | StaffCardData; school: SchoolInfo }) {
  const isStudent = data.type === "student"
  const cardTitle = isStudent ? "STUDENT ID CARD" : "STAFF ID CARD"
  const currentYear = new Date().getFullYear()
  const validStr = `${currentYear} – ${currentYear + 1}`

  const subLabel = isStudent
    ? (data as StudentCardData).className ?? "—"
    : roleLabel((data as StaffCardData).role)

  const rows = isStudent
    ? [
        { label: "Student ID",  value: (data as StudentCardData).studentId },
        { label: "Roll No",     value: (data as StudentCardData).rollNumber },
        { label: "Date of Birth", value: fmt((data as StudentCardData).dateOfBirth) },
        { label: "Gender",      value: (data as StudentCardData).gender
            ? (data as StudentCardData).gender!.charAt(0) + (data as StudentCardData).gender!.slice(1).toLowerCase()
            : null },
        { label: "Blood Group", value: (data as StudentCardData).bloodGroup },
        { label: "Nationality", value: (data as StudentCardData).nationality },
        { label: "Admitted",    value: fmt((data as StudentCardData).admissionDate) },
      ]
    : [
        { label: "Staff ID",       value: (data as StaffCardData).staffId },
        { label: "Designation",    value: (data as StaffCardData).designation },
        { label: "Department",     value: (data as StaffCardData).department },
        { label: "Qualification",  value: (data as StaffCardData).qualification },
        { label: "Date Joined",    value: fmt((data as StaffCardData).joiningDate) },
        { label: "Phone",          value: (data as StaffCardData).phone },
        { label: "Email",          value: (data as StaffCardData).email },
      ]

  const visibleRows = rows.filter(r => r.value)

  return (
    <div style={{
      width: 440, height: 270,
      borderRadius: 14, overflow: "hidden",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
      background: "white",
      position: "relative",
    }}>
      {/* ── Subtle watermark ── */}
      <div style={{
        position: "absolute", bottom: 34, right: -16,
        fontSize: 72, fontWeight: 900, letterSpacing: -2,
        color: "rgba(79,70,229,0.05)",
        transform: "rotate(-18deg)",
        userSelect: "none", pointerEvents: "none",
        lineHeight: 1,
      }}>
        {school.name.split(" ")[0].toUpperCase()}
      </div>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)",
        height: 58, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 16px", gap: 8,
      }}>
        {/* Logo */}
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.35)",
          overflow: "hidden", flexShrink: 0,
          background: "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {school.logo
            ? <img src={school.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ color: "white", fontWeight: 800, fontSize: 13 }}>{initials(school.name)}</span>
          }
        </div>

        {/* School name */}
        <div style={{ flex: 1, textAlign: "center", padding: "0 6px" }}>
          <div style={{ color: "white", fontWeight: 800, fontSize: 13, letterSpacing: 0.6, lineHeight: 1.25 }}>
            {school.name.toUpperCase()}
          </div>
          {school.address && (
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, marginTop: 2, letterSpacing: 0.3 }}>
              {school.address.split(",")[0]}
            </div>
          )}
        </div>

        {/* Card type badge */}
        <div style={{
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 6, padding: "4px 10px", flexShrink: 0,
          textAlign: "center",
        }}>
          <div style={{ color: "#fbbf24", fontSize: 7.5, fontWeight: 800, letterSpacing: 1.2, whiteSpace: "nowrap" }}>
            {cardTitle}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", padding: "14px 16px", gap: 16, height: 178 }}>
        {/* Photo column */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <Avatar name={data.name} photo={data.photo} size={88} />
          <div style={{
            fontSize: 7, fontWeight: 700, color: "#6366f1",
            background: "#eef2ff", padding: "2px 8px", borderRadius: 20,
            letterSpacing: 0.8, whiteSpace: "nowrap",
          }}>
            {isStudent ? "STUDENT" : (data as StaffCardData).role ?? "STAFF"}
          </div>
        </div>

        {/* Details column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name */}
          <div style={{
            fontSize: 15, fontWeight: 900, color: "#111827",
            textTransform: "uppercase", letterSpacing: 0.4,
            lineHeight: 1.2, marginBottom: 4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {data.name}
          </div>

          {/* Class / Role pill */}
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            color: "white", fontSize: 8, fontWeight: 700,
            padding: "3px 10px", borderRadius: 20,
            letterSpacing: 0.7, marginBottom: 10,
          }}>
            {subLabel.toUpperCase()}
          </div>

          {/* Detail grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 10px" }}>
            {visibleRows.map((row, i) => (
              <div key={i} style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 7, color: "#9ca3af", letterSpacing: 0.6, fontWeight: 600, textTransform: "uppercase" }}>
                  {row.label}
                </div>
                <div style={{ fontSize: 9, color: "#1f2937", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)",
        height: 34, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 16px",
      }}>
        <div style={{ fontSize: 7.5, color: "rgba(255,255,255,0.65)", letterSpacing: 0.3 }}>
          {[school.phone && `Tel: ${school.phone}`, school.email].filter(Boolean).join("  ·  ")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {school.headmaster && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 6.5, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>HEADMASTER / PRINCIPAL</div>
              <div style={{ fontSize: 8, color: "white", fontWeight: 700 }}>{school.headmaster}</div>
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 6.5, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5 }}>VALID</div>
            <div style={{ fontSize: 9, color: "#fbbf24", fontWeight: 800 }}>{validStr}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function printCard(html: string, title: string) {
  const win = window.open("", "_blank", "width=560,height=380,toolbar=0,scrollbars=0,status=0")
  if (!win) { alert("Please allow pop-ups to print the ID card."); return }

  win.document.write(`<!DOCTYPE html><html><head>
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
  @page { size: 440px 270px; margin: 0; }
  @media print { body { min-height: unset; padding: 0; } }
</style>
</head><body>${html}<script>
(function(){
  var imgs = document.querySelectorAll('img');
  var total = imgs.length, loaded = 0;
  function tryPrint(){
    window.print();
    setTimeout(function(){ window.close(); }, 500);
  }
  if(total === 0){ tryPrint(); return; }
  imgs.forEach(function(img){
    if(img.complete){ loaded++; if(loaded===total) tryPrint(); }
    else { img.onload = img.onerror = function(){ loaded++; if(loaded===total) tryPrint(); }; }
  });
  // Fallback if images never fire
  setTimeout(tryPrint, 2500);
})();
<\/script></body></html>`)
  win.document.close()
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

export default function IDCard({ data, school, onClose }: IDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isStudent = data.type === "student"
  const cardTitle = `${isStudent ? "Student" : "Staff"} ID Card – ${data.name}`

  function handlePrint() {
    if (!cardRef.current) return
    printCard(cardRef.current.innerHTML, cardTitle)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{cardTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Card preview */}
        <div className="flex flex-col items-center gap-4 p-6">
          {/* Scale wrapper so the card fits narrow screens */}
          <div style={{ transform: "scale(0.96)", transformOrigin: "top center" }}>
            <div ref={cardRef}>
              <CardFace data={data} school={school} />
            </div>
          </div>
          <p className="text-xs text-gray-400">A print dialog will open for this card.</p>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print ID Card
          </button>
        </div>
      </div>
    </div>
  )
}
