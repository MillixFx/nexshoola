import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import LibraryClient from "./LibraryClient"
export const dynamic = "force-dynamic"

export default async function LibraryPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")
  const raw = await prisma.book.findMany({ where: { schoolId }, orderBy: { title: "asc" } })
  const books = raw.map(({ categoryName, available, ...b }) => ({ ...b, category: categoryName, availableQty: available }))
  return <LibraryClient books={books} schoolId={schoolId} />
}
