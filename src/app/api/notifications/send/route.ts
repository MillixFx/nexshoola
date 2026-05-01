import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotification, SmsTemplates } from "@/lib/sms"

/**
 * POST /api/notifications/send
 *
 * Manual notification sender — used by admin tools to broadcast SMS/WhatsApp.
 *
 * Body:
 *   {
 *     userIds?: string[]            // specific recipients (must be in your school)
 *     role?: "PARENT"|"TEACHER"...  // OR target a role
 *     classId?: string              // OR target parents of a class
 *     channel?: "SMS"|"WHATSAPP"|"BOTH"
 *     message: string               // template-rendered already
 *     template?: keyof typeof SmsTemplates
 *     templateArgs?: any[]          // pass to the template fn
 *   }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.schoolId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["ADMIN", "HEADMASTER"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const schoolId = session.user.schoolId
  const body = await req.json()
  const { userIds, role, classId, channel = "SMS", template, templateArgs = [] } = body
  let { message } = body

  // Render template if provided
  if (template && SmsTemplates[template as keyof typeof SmsTemplates]) {
    const fn = SmsTemplates[template as keyof typeof SmsTemplates] as (...args: any[]) => string
    message = fn(...templateArgs)
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 })
  }

  // Resolve recipients
  let phones: { userId: string; name: string; phone: string }[] = []

  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, schoolId, isActive: true },
      select: { id: true, name: true, phone: true },
    })
    phones = users.filter(u => !!u.phone).map(u => ({ userId: u.id, name: u.name, phone: u.phone! }))
  } else if (classId) {
    // Parents of students in a class
    const students = await prisma.student.findMany({
      where: { classId, schoolId, isActive: true },
      include: {
        parents: { include: { parent: { include: { user: true } } } },
      },
    })
    const seen = new Set<string>()
    for (const s of students) {
      for (const sp of s.parents) {
        const u = sp.parent.user
        if (u.phone && !seen.has(u.id)) {
          seen.add(u.id)
          phones.push({ userId: u.id, name: u.name, phone: u.phone })
        }
      }
    }
  } else if (role) {
    const users = await prisma.user.findMany({
      where: { schoolId, role, isActive: true },
      select: { id: true, name: true, phone: true },
    })
    phones = users.filter(u => !!u.phone).map(u => ({ userId: u.id, name: u.name, phone: u.phone! }))
  } else {
    return NextResponse.json({ error: "Provide userIds, role, or classId" }, { status: 400 })
  }

  if (phones.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: "No recipients with phone numbers" })
  }

  // Send in parallel (Hubtel is rate-limit friendly, but cap concurrency at 10)
  const results: { userId: string; ok: boolean; error?: string }[] = []
  const batch = 10
  for (let i = 0; i < phones.length; i += batch) {
    const slice = phones.slice(i, i + batch)
    const out = await Promise.all(
      slice.map(async (p) => {
        const r = await sendNotification({ to: p.phone, message, channel: channel as any })
        return { userId: p.userId, ok: r.ok, error: r.error }
      })
    )
    results.push(...out)
  }

  const sent = results.filter(r => r.ok).length
  const failed = results.length - sent

  return NextResponse.json({
    sent,
    failed,
    total: phones.length,
    failures: results.filter(r => !r.ok).slice(0, 10),
  })
}
