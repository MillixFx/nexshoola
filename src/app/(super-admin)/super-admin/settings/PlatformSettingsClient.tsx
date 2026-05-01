"use client"

import { useState } from "react"
import { Key, Save, Check, Eye, EyeOff, DollarSign, Globe, Loader2, AlertTriangle } from "lucide-react"

type PlatformConfig = {
  id?: string
  paystackSecretKey?: string | null
  paystackPublicKey?: string | null
  paystackWebhookSecret?: string | null
  feePerStudentTermly?: number | null
  platformFeePercent?: number | null
  currency?: string | null
  siteName?: string | null
  supportEmail?: string | null
} | null

export default function PlatformSettingsClient({ config }: { config: PlatformConfig }) {
  const [form, setForm] = useState({
    paystackSecretKey: config?.paystackSecretKey ?? "",
    paystackPublicKey: config?.paystackPublicKey ?? "",
    paystackWebhookSecret: config?.paystackWebhookSecret ?? "",
    feePerStudentTermly: config?.feePerStudentTermly ?? 15,
    platformFeePercent: config?.platformFeePercent ?? 0,
    currency: config?.currency ?? "GHS",
    siteName: config?.siteName ?? "NexSchoola",
    supportEmail: config?.supportEmail ?? "",
  })
  const [showSecret, setShowSecret] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setSaved(false)
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure global API keys, fees, and platform settings</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Paystack Keys */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <Key className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Paystack API Keys</h2>
              <p className="text-xs text-gray-400">Platform-wide Paystack keys used for all school fee collections</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Public Key</label>
              <input className="input font-mono text-xs" value={form.paystackPublicKey} onChange={e => setForm(f => ({ ...f, paystackPublicKey: e.target.value }))} placeholder="pk_test_xxxxxxxxxxxxxxxxxxxx" />
              <p className="text-[10px] text-gray-400 mt-1">Used in frontend — safe to expose</p>
            </div>
            <div>
              <label className="label">Secret Key</label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  className="input font-mono text-xs pr-10"
                  value={form.paystackSecretKey}
                  onChange={e => setForm(f => ({ ...f, paystackSecretKey: e.target.value }))}
                  placeholder="sk_test_xxxxxxxxxxxxxxxxxxxx"
                />
                <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Never share this key — keep it server-side only
              </p>
            </div>
            <div>
              <label className="label">Webhook Secret</label>
              <div className="relative">
                <input
                  type={showWebhook ? "text" : "password"}
                  className="input font-mono text-xs pr-10"
                  value={form.paystackWebhookSecret}
                  onChange={e => setForm(f => ({ ...f, paystackWebhookSecret: e.target.value }))}
                  placeholder="whsk_xxxxxxxxxxxxxxxx"
                />
                <button type="button" onClick={() => setShowWebhook(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Used to verify Paystack webhook payloads</p>
            </div>
          </div>
        </div>

        {/* Fee Structure */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Fee Structure</h2>
              <p className="text-xs text-gray-400">Platform subscription pricing charged to each school</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fee Per Student Per Term (GHS)</label>
              <input
                type="number" min="0" step="0.5" className="input"
                value={form.feePerStudentTermly}
                onChange={e => setForm(f => ({ ...f, feePerStudentTermly: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-gray-400 mt-1">Amount each school pays per enrolled student per term</p>
            </div>
            <div>
              <label className="label">Platform Fee % (on payments)</label>
              <input
                type="number" min="0" max="100" step="0.1" className="input"
                value={form.platformFeePercent}
                onChange={e => setForm(f => ({ ...f, platformFeePercent: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-gray-400 mt-1">% deducted from each student payment (0 = school keeps all)</p>
            </div>
          </div>
        </div>

        {/* General */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center">
              <Globe className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">General</h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Platform Name</label>
              <input className="input" value={form.siteName} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))} placeholder="NexSchoola" />
            </div>
            <div>
              <label className="label">Support Email</label>
              <input type="email" className="input" value={form.supportEmail} onChange={e => setForm(f => ({ ...f, supportEmail: e.target.value }))} placeholder="support@nexschoola.com" />
            </div>
            <div>
              <label className="label">Default Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="GHS">GHS — Ghana Cedis</option>
                <option value="NGN">NGN — Naira</option>
                <option value="KES">KES — Shilling</option>
                <option value="USD">USD — Dollar</option>
                <option value="GBP">GBP — Pound</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors ${saved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </form>

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.375rem; }
        .input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; outline: none; }
        .input:focus { outline: 2px solid #6366f1; outline-offset: 0; border-color: #6366f1; }
      `}</style>
    </div>
  )
}
