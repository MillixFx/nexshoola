// Paystack integration — Ghana (GHS) + Mobile Money
// Docs: https://paystack.com/docs/api

const PAYSTACK_BASE = "https://api.paystack.co"

// Use platform config secret key if available (stored in DB), else fall back to env
function getSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY ?? ""
}

interface PaystackInitParams {
  email: string
  amount: number            // already in pesewas (smallest unit)
  currency?: string         // default GHS
  reference?: string
  callback_url?: string
  metadata?: Record<string, unknown>
  channels?: ("card" | "bank" | "ussd" | "qr" | "mobile_money" | "bank_transfer")[]
  subaccount?: string       // Paystack subaccount code for split payments
  transaction_charge?: number // Amount in pesewas to charge on top (platform fee)
  bearer?: "account" | "subaccount" // Who bears the Paystack transaction fee
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
export async function initializePayment(params: PaystackInitParams): Promise<PaystackInitResponse["data"]> {
  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount, // already in pesewas
      currency: params.currency ?? "GHS",
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata,
      channels: params.channels ?? ["card", "bank", "mobile_money", "bank_transfer"],
      ...(params.subaccount && { subaccount: params.subaccount }),
      ...(params.transaction_charge && { transaction_charge: params.transaction_charge }),
      ...(params.bearer && { bearer: params.bearer }),
    }),
  })

  const json: PaystackInitResponse = await response.json()

  if (!json.status) {
    throw new Error(json.message ?? "Paystack initialization failed")
  }

  return json.data
}

// Verify a Paystack transaction
export async function verifyPayment(reference: string) {
  const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  })
  return response.json()
}

// Create a Paystack subaccount for a school (so fees go directly to school's bank)
export async function createSubaccount(params: {
  business_name: string
  settlement_bank: string  // bank code e.g. "044" for GTBank
  account_number: string
  percentage_charge?: number // platform's % cut (0 = school keeps all)
  description?: string
}) {
  const response = await fetch(`${PAYSTACK_BASE}/subaccount`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name: params.business_name,
      settlement_bank: params.settlement_bank,
      account_number: params.account_number,
      percentage_charge: params.percentage_charge ?? 0,
      description: params.description,
    }),
  })
  return response.json()
}

// List banks (for school subaccount setup)
export async function listBanks(country = "ghana") {
  const response = await fetch(`${PAYSTACK_BASE}/bank?country=${country}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  })
  return response.json()
}

// Create a Paystack subscription plan
export async function createPlan(params: {
  name: string
  interval: "monthly" | "annually" | "quarterly"
  amount: number // GHS
  description?: string
}) {
  const response = await fetch(`${PAYSTACK_BASE}/plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
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
