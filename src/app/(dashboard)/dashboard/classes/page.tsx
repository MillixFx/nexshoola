import { Construction } from 'lucide-react'

export default function ClassesTimetablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classes & Timetables</h1>
        <p className="text-sm text-gray-500 mt-1">Manage classes, sections, and weekly routines.</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
          <Construction className="w-7 h-7 text-indigo-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Classes & Timetables Module</h2>
        <p className="text-sm text-gray-500 max-w-sm">Manage classes, sections, and weekly routines. This module is actively being built.</p>
        <span className="mt-4 inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Coming Soon
        </span>
      </div>
    </div>
  )
}
