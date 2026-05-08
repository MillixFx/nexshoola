import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ChatClient from "@/app/(dashboard)/dashboard/chat/ChatClient"

export const dynamic = "force-dynamic"

export default async function SuperAdminChatPage() {
  const session = await auth()
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/login")

  return (
    <ChatClient
      currentUserId={session.user.id!}
      currentUserName={session.user.name ?? "Platform Owner"}
      currentUserRole="SUPER_ADMIN"
    />
  )
}
