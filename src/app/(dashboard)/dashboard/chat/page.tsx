import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ChatClient from "./ChatClient"

export const dynamic = "force-dynamic"

export default async function ChatPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <ChatClient
      currentUserId={session.user.id}
      currentUserName={session.user.name ?? "Me"}
      currentUserRole={session.user.role ?? "STUDENT"}
    />
  )
}
