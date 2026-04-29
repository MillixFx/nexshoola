import { prisma } from "@/lib/prisma"
import LibraryClient from "./LibraryClient"
export const dynamic = "force-dynamic"

export default async function LibraryPage() {
  const school = await prisma.school.findFirst()
  const schoolId = school?.id ?? ""
  const books = await prisma.book.findMany({ where: { schoolId }, orderBy: { title: "asc" } })
  return <LibraryClient books={books} schoolId={schoolId} />
}
