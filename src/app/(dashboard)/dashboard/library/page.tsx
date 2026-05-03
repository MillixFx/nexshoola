import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import LibraryClient from "./LibraryClient"
export const dynamic = "force-dynamic"

export default async function LibraryPage() {
  const session = await auth()
  const schoolId = session?.user?.schoolId
  if (!schoolId) redirect("/login")

  const [rawBooks, rawIssues, users] = await Promise.all([
    prisma.book.findMany({ where: { schoolId }, orderBy: { title: "asc" } }),
    prisma.bookIssue.findMany({
      where: { book: { schoolId } },
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true } },
        member: {
          select: {
            id: true,
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
      orderBy: { issueDate: "desc" },
    }),
    prisma.user.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ])

  const books = rawBooks.map(({ categoryName, available, ...b }) => ({
    ...b,
    category: categoryName,
    availableQty: available,
  }))

  const issues = rawIssues.map(i => ({
    id: i.id,
    status: i.status as "ISSUED" | "RETURNED" | "OVERDUE",
    issueDate:  i.issueDate.toISOString(),
    dueDate:    i.dueDate.toISOString(),
    returnDate: i.returnDate?.toISOString() ?? null,
    book:   i.book,
    member: i.member,
  }))

  return (
    <LibraryClient
      books={books}
      issues={issues}
      users={users}
      schoolId={schoolId}
    />
  )
}
