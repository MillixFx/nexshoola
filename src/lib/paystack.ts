// Paystack integration — Ghana (GHS) + Mobile Money
// Docs: https://paystack.com/docs/api

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!
const PAYSTACK_BASE = "https://api.paystack.co"

interface PaystackInitParams {
  email: string
  amount: number          // in GHS (we multiply by 100 for pesewas)
  currency?: string       // default GHS
  reference?: string
  callback_url?: string
  metadata?: Record<string, unknown>
  channels?: ("card" | "bank" | "ussd" | "qr" | "mobile_money" | "bank_transfer")[]
}

interface PaystackInitResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

// Initialize a Paystack transaction
export async function initializePayment(params: PaystackInitParams): Promise<PaystackInitResponse> {
  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...params,
      amount: Math.round(params.amount * 100), // convert GHS to pesewas
      currency: params.currency ?? "GHS",
      // Enable all payment channels including Mobile Money
      channels: params.channels ?? ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
    }),
  })

  if (!response.ok) {
    throw new Error(`Paystack initialization failed: ${response.statusText}`)
  }

  return response.json()
}

// Verify a Paystack transaction
export async function verifyPayment(reference: string) {
  const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Paystack verification failed: ${response.statusText}`)
  }

  return response.json()
}

// Create a Paystack subscription plan (for school SaaS billing)
export async function createPlan(params: {
  name: string
  interval: "monthly" | "annually" | "quarterly"
  amount: number // GHS
  description?: string
}) {
  const response = await fetch(`${PAYSTACK_BASE}/plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...params,
      amount: Math.round(params.amount * 100),
      currency: "GHS",
    }),
  })

  return response.json()
}

// Generate unique payment reference
export function generateReference(prefix = "NEXSCHOOLA") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
}

// NexSchoola subscription plans (GHS)
export const NEXSCHOOLA_PLANS = {
  BASIC_TERM: { name: "NexSchoola Basic (Per Term)", amount: 150, interval: "quarterly" as const },
  PRO_TERM: { name: "NexSchoola Pro (Per Term)", amount: 280, interval: "quarterly" as const },
  BASIC_ANNUAL: { name: "NexSchoola Basic (Annual)", amount: 500, interval: "annually" as const },
  PRO_ANNUAL: { name: "NexSchoola Pro (Annual)", amount: 900, interval: "annually" as const },
}
