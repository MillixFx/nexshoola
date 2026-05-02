import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import NoticeClient from "./NoticeClient"
export const dynamic = "force-dynamic"

export default async function NoticeBoardPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const notices = await prisma.notice.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } })
  return <NoticeClient notices={notices} schoolId={schoolId} />
}
