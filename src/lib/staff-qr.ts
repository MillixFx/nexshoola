/**
 * Staff QR code utilities for the kiosk attendance system.
 *
 * Each staff member gets a PERMANENT QR code that encodes:
 *   {userId}:{HMAC-SHA256(schoolQrSecret, userId)}
 *
 * The HMAC ties the token to the school's secret — tokens from one school
 * cannot be used at another school's kiosk.
 *
 * The kiosk device supplies its own device token on every check-in, providing
 * a second layer: even if someone screenshots a QR code, it only works on a
 * registered device at the right school.
 */

import { createHmac, createHash, randomBytes } from "crypto"

// ── QR token (per-employee, permanent) ───────────────────────────────────────

/** Generate or verify the per-staff QR token payload */
export function makeStaffQrPayload(userId: string, schoolQrSecret: string): string {
  const sig = createHmac("sha256", schoolQrSecret).update(userId).digest("hex").slice(0, 24)
  return `${userId}:${sig}`
}

export function verifyStaffQrPayload(
  payload: string,
  schoolQrSecret: string
): { valid: true; userId: string } | { valid: false } {
  const [userId, sig] = payload.split(":")
  if (!userId || !sig) return { valid: false }
  const expected = createHmac("sha256", schoolQrSecret).update(userId).digest("hex").slice(0, 24)
  return sig === expected ? { valid: true, userId } : { valid: false }
}

// ── School QR secret (generated once, stored in School.staffQrSecret) ────────

export function generateSchoolQrSecret(): string {
  return randomBytes(32).toString("hex")
}

// ── Kiosk device token ────────────────────────────────────────────────────────

/** Generate a new plain device token (store the hash in DB, give plain to kiosk) */
export function generateDeviceToken(): string {
  return randomBytes(20).toString("hex") // 40-char hex string
}

export function hashDeviceToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex")
}

// ── Late determination ────────────────────────────────────────────────────────

/**
 * Given the school's lateAfter time string ("HH:MM") and the current Date,
 * returns "PRESENT" or "LATE".
 */
export function resolveAttendanceStatus(
  lateAfter: string,
  now: Date = new Date()
): "PRESENT" | "LATE" {
  const [lh, lm] = lateAfter.split(":").map(Number)
  const checkH = now.getHours()
  const checkM = now.getMinutes()
  if (checkH > lh || (checkH === lh && checkM >= lm)) return "LATE"
  return "PRESENT"
}
