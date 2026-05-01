/**
 * SMS & WhatsApp messaging via Hubtel.
 *
 * Hubtel is the standard SMS gateway in Ghana — supports SMS to all networks
 * (MTN, Vodafone, AirtelTigo, Glo) plus WhatsApp via the same API.
 *
 * Set in .env / Vercel env vars:
 *   HUBTEL_CLIENT_ID
 *   HUBTEL_CLIENT_SECRET
 *   HUBTEL_SMS_SENDER_ID         (e.g. "NexSchoola" — must be approved by Hubtel)
 *   HUBTEL_WHATSAPP_FROM         (optional — your WhatsApp business number)
 *
 * Falls back to console.log in dev when keys aren't set, so the app doesn't break.
 *
 * Docs: https://developers.hubtel.com/reference/send-quick-messages-2
 */

type SmsResult = { ok: boolean; messageId?: string; error?: string; provider?: string }

function basicAuth() {
  const id = process.env.HUBTEL_CLIENT_ID
  const secret = process.env.HUBTEL_CLIENT_SECRET
  if (!id || !secret) return null
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64")
}

/**
 * Normalize a Ghana phone number to E.164 (+233...).
 * Accepts: 0241234567, 233241234567, +233241234567 → +233241234567
 */
export function normalizeGhPhone(raw: string): string | null {
  if (!raw) return null
  let n = raw.replace(/[^\d+]/g, "")
  if (n.startsWith("+")) return n
  if (n.startsWith("00")) return "+" + n.slice(2)
  if (n.startsWith("233")) return "+" + n
  if (n.startsWith("0") && n.length === 10) return "+233" + n.slice(1)
  if (n.length === 9) return "+233" + n
  return null
}

/**
 * Send a single SMS via Hubtel.
 */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const phone = normalizeGhPhone(to)
  if (!phone) return { ok: false, error: "Invalid phone number" }

  const auth = basicAuth()
  const sender = process.env.HUBTEL_SMS_SENDER_ID || "NexSchoola"

  // Dev fallback — log instead of failing when no creds
  if (!auth) {
    console.log(`[SMS DEV] → ${phone}: ${message}`)
    return { ok: true, messageId: "dev-stub", provider: "console" }
  }

  try {
    const url = `https://smsc.hubtel.com/v1/messages/send?clientid=${process.env.HUBTEL_CLIENT_ID}&clientsecret=${process.env.HUBTEL_CLIENT_SECRET}&from=${encodeURIComponent(sender)}&to=${encodeURIComponent(phone)}&content=${encodeURIComponent(message)}`
    const res = await fetch(url, { method: "GET" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || (data.status && data.status !== 0 && data.Status !== 0)) {
      return { ok: false, error: data.statusDescription || data.Message || "SMS failed", provider: "hubtel" }
    }
    return { ok: true, messageId: data.messageId || data.MessageId, provider: "hubtel" }
  } catch (e: any) {
    return { ok: false, error: e.message, provider: "hubtel" }
  }
}

/**
 * Send a WhatsApp message via Hubtel.
 */
export async function sendWhatsapp(to: string, message: string): Promise<SmsResult> {
  const phone = normalizeGhPhone(to)
  if (!phone) return { ok: false, error: "Invalid phone number" }

  const auth = basicAuth()
  const from = process.env.HUBTEL_WHATSAPP_FROM

  if (!auth || !from) {
    console.log(`[WHATSAPP DEV] → ${phone}: ${message}`)
    return { ok: true, messageId: "dev-stub", provider: "console" }
  }

  try {
    const res = await fetch("https://api-whatsapp.hubtel.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        from,
        to: phone,
        type: "text",
        text: { body: message },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.message || "WhatsApp failed", provider: "hubtel-whatsapp" }
    return { ok: true, messageId: data.messageId, provider: "hubtel-whatsapp" }
  } catch (e: any) {
    return { ok: false, error: e.message, provider: "hubtel-whatsapp" }
  }
}

/**
 * Send a notification via the user's preferred channel.
 * Tries SMS first, falls back to WhatsApp if SMS fails (or vice versa per config).
 */
export async function sendNotification(opts: {
  to: string
  message: string
  channel?: "SMS" | "WHATSAPP" | "BOTH"
}): Promise<SmsResult> {
  const { to, message, channel = "SMS" } = opts
  if (channel === "WHATSAPP") return sendWhatsapp(to, message)
  if (channel === "BOTH") {
    const sms = await sendSms(to, message)
    const wa = await sendWhatsapp(to, message)
    return sms.ok || wa.ok ? { ok: true, provider: "both" } : sms
  }
  return sendSms(to, message)
}

/**
 * Pre-built notification templates used across the app.
 */
export const SmsTemplates = {
  paymentConfirmation: (parentName: string, studentName: string, amount: number, term: string) =>
    `Hello ${parentName}, your fee payment of GH₵${amount.toFixed(2)} for ${studentName} (${term}) has been received. Thank you!`,

  feeReminder: (parentName: string, studentName: string, amount: number, dueDate: string) =>
    `Reminder: Fee balance of GH₵${amount.toFixed(2)} due on ${dueDate} for ${studentName}. Pay via the parent portal. — ${parentName}`,

  absenceAlert: (parentName: string, studentName: string, date: string) =>
    `Hello ${parentName}, ${studentName} was marked ABSENT on ${date}. Please contact the school if this is unexpected.`,

  newNotice: (audience: string, title: string) =>
    `[School Notice — ${audience}] ${title}. Login to your dashboard for details.`,

  reportCardReady: (parentName: string, studentName: string, term: string) =>
    `Hello ${parentName}, the ${term} report card for ${studentName} is now available. Login to view.`,

  examScheduled: (audience: string, examTitle: string, startDate: string) =>
    `[${audience}] ${examTitle} starts ${startDate}. Check the school calendar for the full timetable.`,
}
