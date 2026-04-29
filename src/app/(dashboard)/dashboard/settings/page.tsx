import { prisma } from "@/lib/prisma"
import SettingsClient from "./SettingsClient"
export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const school = await prisma.school.findFirst()
  return <SettingsClient school={school} />
}
