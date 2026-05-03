"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"

interface Props {
  slipId: string
  amount: number
}

export default function FeePayButton({ slipId, amount }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handlePay() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/fee-slips/${slipId}/pay`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Payment initialization failed")
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        throw new Error("No payment URL returned")
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="shrink-0 flex flex-col items-end gap-1">
      <button
        onClick={handlePay}
        disabled={loading}
        className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
        {loading ? "Loading…" : "Pay Now"}
      </button>
      {error && <p className="text-xs text-red-500 max-w-[120px] text-right">{error}</p>}
    </div>
  )
}
