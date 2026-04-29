import { prisma } from "@/lib/prisma"
import NoticeClient from "./NoticeClient"
export const dynamic = "force-dynamic"

export default async function NoticeBoardPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const notices = await prisma.notice.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } })
  return <NoticeClient notices={notices} schoolId={schoolId} />
}
