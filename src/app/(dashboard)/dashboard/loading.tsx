export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-40 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 w-24 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-xl" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="h-9 w-full sm:w-64 bg-gray-100 rounded-xl" />
        </div>
        <div className="divide-y divide-gray-50">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 sm:px-6 py-4">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-6 w-16 bg-gray-100 rounded-full hidden sm:block" />
              <div className="h-8 w-8 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
