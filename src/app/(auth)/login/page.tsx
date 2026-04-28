import Link from "next/link"
import { GraduationCap } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-white">
              Nex<span className="text-indigo-300">Schoool</span>a
            </span>
          </Link>
          <p className="text-indigo-300 text-sm mt-3">Sign in to your school dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Welcome back</h1>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">School subdomain</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                <input
                  type="text"
                  placeholder="yourschool"
                  className="flex-1 px-4 py-3 text-sm outline-none"
                />
                <span className="bg-gray-50 px-3 py-3 text-xs text-gray-400 border-l border-gray-200 shrink-0">
                  .nexschoola.com
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                placeholder="admin@school.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-indigo-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 text-sm"
            >
              Sign in
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
              Register your school
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
