import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PlatformSettingsClient from "./PlatformSettingsClient"

export const dynamic = "force-dynamic"

export default async function PlatformSettingsPage() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/login")

  const config = await prisma.platformConfig.findFirst()

  return <PlatformSettingsClient config={config as any} />
}
