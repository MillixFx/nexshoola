"use client"

import { ReactNode, useState, useEffect } from "react"
import { Search, ChevronLeft, ChevronRight, List, LayoutGrid, Grid3X3 } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
  className?: string
  /** If true, this column is the primary identity column (avatar + name). */
  primary?: boolean
  /** If true, don't show this column in compact card mode. */
  hideCompact?: boolean
}

type ViewMode = "list" | "card" | "compact"

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  emptyMessage?: string
  pageSize?: number
  actions?: (row: T) => ReactNode
  /** localStorage key for persisting the chosen view (e.g. "students") */
  viewKey?: string
  /** Returns the photo URL for a row (used in card/compact view header) */
  photoUrl?: (row: T) => string | null | undefined
  /** Returns initials for a row (used when no photo) */
  initials?: (row: T) => string
}

// ─── View toggle ──────────────────────────────────────────────────────────────
function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const btns: { m: ViewMode; icon: ReactNode; title: string }[] = [
    { m: "list",    icon: <List className="w-3.5 h-3.5" />,       title: "List view"         },
    { m: "card",    icon: <LayoutGrid className="w-3.5 h-3.5" />, title: "Card view"         },
    { m: "compact", icon: <Grid3X3 className="w-3.5 h-3.5" />,   title: "Compact card view" },
  ]
  return (
    <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden shrink-0">
      {btns.map(({ m, icon, title }) => (
        <button
          key={m}
          title={title}
          onClick={() => onChange(m)}
          className={cn(
            "px-2.5 py-2 transition-colors",
            mode === m
              ? "bg-indigo-600 text-white"
              : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

// ─── Avatar helper ────────────────────────────────────────────────────────────
function Avatar({
  photo, name, initials: init, size,
}: { photo?: string | null; name: string; initials?: string; size: "sm" | "lg" }) {
  const text = init ?? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const sizeCls = size === "lg"
    ? "w-16 h-16 text-lg"
    : "w-10 h-10 text-sm"

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={cn(sizeCls, "rounded-full object-cover border-2 border-white shadow-sm shrink-0")}
      />
    )
  }
  return (
    <div className={cn(
      sizeCls,
      "rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border-2 border-white shadow-sm shrink-0"
    )}>
      {text}
    </div>
  )
}

// ─── Card Grid ────────────────────────────────────────────────────────────────
function CardGrid<T extends Record<string, any>>({
  rows, columns, keyField, actions, compact, photoUrl, initials,
}: {
  rows: T[]
  columns: Column<T>[]
  keyField: keyof T
  actions?: (row: T) => ReactNode
  compact: boolean
  photoUrl?: (row: T) => string | null | undefined
  initials?: (row: T) => string
}) {
  const primaryIdx = columns.findIndex(c => c.primary) >= 0
    ? columns.findIndex(c => c.primary)
    : 0
  const primaryCol = columns[primaryIdx]
  const detailCols = columns.filter((_, i) => i !== primaryIdx)

  // ── Compact card ─────────────────────────────────────────────────────────────
  if (compact) {
    const badgeCol = detailCols[detailCols.length - 1] // last = usually status
    return (
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {rows.map(row => {
          const photo = photoUrl?.(row)
          const name  = String(row[primaryCol.key] ?? "")
          const init  = initials?.(row)
          return (
            <div
              key={String(row[keyField])}
              className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center gap-2 text-center hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              {/* Photo / initials */}
              {photoUrl !== undefined ? (
                <Avatar photo={photo} name={name} initials={init} size="sm" />
              ) : null}

              {/* Primary content */}
              <div className="min-w-0 w-full">
                {primaryCol.render ? (
                  <div className="text-sm [&_a]:hover:underline [&_a]:text-gray-900 [&_p]:truncate [&_img]:hidden [&_div.w-8]:hidden">
                    {primaryCol.render(row)}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                )}
              </div>

              {/* Badge (last column, usually status/role) */}
              {badgeCol && (
                <div className="text-xs">
                  {badgeCol.render ? badgeCol.render(row) : (
                    <span className="text-gray-500">{String(row[badgeCol.key] ?? "—")}</span>
                  )}
                </div>
              )}

              {/* Actions */}
              {actions && (
                <div className="pt-1 border-t border-gray-100 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {actions(row)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Full card ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rows.map(row => {
        const photo = photoUrl?.(row)
        const name  = String(row[primaryCol.key] ?? "")
        const init  = initials?.(row)
        return (
          <div
            key={String(row[keyField])}
            className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
          >
            {/* Photo header */}
            {photoUrl !== undefined ? (
              <div className="bg-gradient-to-b from-indigo-50 to-white pt-5 pb-3 flex flex-col items-center gap-2">
                <Avatar photo={photo} name={name} initials={init} size="lg" />
                {/* Primary column details (name, email) inline here */}
                <div className="text-center px-3 [&_a]:text-inherit [&_img]:hidden [&_.w-8]:hidden [&_.w-8.h-8]:hidden">
                  {primaryCol.render ? primaryCol.render(row) : (
                    <p className="font-semibold text-gray-900 truncate">{name}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4">
                {primaryCol.render ? primaryCol.render(row) : (
                  <p className="font-semibold text-gray-900">{name}</p>
                )}
              </div>
            )}

            {/* Detail rows */}
            {detailCols.filter(c => !c.hideCompact).length > 0 && (
              <div className="px-4 py-3 space-y-2 border-t border-gray-100 flex-1">
                {detailCols.filter(c => !c.hideCompact).map(col => (
                  <div key={col.key} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 shrink-0">
                      {col.label}
                    </span>
                    <span className="text-xs text-gray-700 truncate text-right max-w-[60%]">
                      {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {actions && (
              <div className="px-4 py-2.5 border-t border-gray-100 flex justify-end bg-gray-50/50">
                {actions(row)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main DataTable ───────────────────────────────────────────────────────────
export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  searchPlaceholder = "Search…",
  searchKeys = [],
  emptyMessage = "No records found.",
  pageSize = 15,
  actions,
  viewKey,
  photoUrl,
  initials,
}: DataTableProps<T>) {
  const storageKey = viewKey ? `nexschoola-view-${viewKey}` : null

  const [query,    setQuery]    = useState("")
  const [page,     setPage]     = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  // Restore persisted view preference
  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey) as ViewMode | null
    if (saved === "list" || saved === "card" || saved === "compact") setViewMode(saved)
  }, [storageKey])

  function changeView(m: ViewMode) {
    setViewMode(m)
    if (storageKey) localStorage.setItem(storageKey, m)
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = query
    ? data.filter(row =>
        searchKeys.some(k => {
          const val = row[k]
          if (typeof val === "object" && val !== null) {
            return Object.values(val).some(v =>
              String(v ?? "").toLowerCase().includes(query.toLowerCase())
            )
          }
          return String(val ?? "").toLowerCase().includes(query.toLowerCase())
        })
      )
    : data

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleSearch(val: string) { setQuery(val); setPage(1) }

  const showEmpty = paginated.length === 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <ViewToggle mode={viewMode} onChange={changeView} />

        {filtered.length !== data.length && (
          <span className="text-xs text-gray-400 whitespace-nowrap hidden sm:block">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── List view ─────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
                      col.className
                    )}
                  >
                    {col.label}
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {showEmpty ? (
                <tr>
                  <td
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginated.map(row => (
                  <tr key={String(row[keyField])} className="hover:bg-gray-50/70 transition-colors">
                    {columns.map(col => (
                      <td key={col.key} className={cn("px-4 py-3 text-gray-700", col.className)}>
                        {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3 text-right">{actions(row)}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Card / Compact views ──────────────────────────────────────────── */}
      {(viewMode === "card" || viewMode === "compact") && (
        showEmpty ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">{emptyMessage}</div>
        ) : (
          <CardGrid
            rows={paginated}
            columns={columns}
            keyField={keyField}
            actions={actions}
            compact={viewMode === "compact"}
            photoUrl={photoUrl}
            initials={initials}
          />
        )
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {filtered.length > pageSize && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {viewMode === "list"
              ? `Showing ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, filtered.length)} of ${filtered.length}`
              : `${filtered.length} record${filtered.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p =
                totalPages <= 5 ? i + 1
                : page <= 3 ? i + 1
                : page >= totalPages - 2 ? totalPages - 4 + i
                : page - 2 + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-7 h-7 text-xs rounded-lg font-medium",
                    p === page ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
