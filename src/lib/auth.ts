import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        schoolSlug: { label: "School", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string
        const schoolSlug = (credentials.schoolSlug as string) ?? ""

        // ── Super Admin Login ─────────────────────────────────────────────
        // If slug is blank or "superadmin", look for a SUPER_ADMIN user globally
        if (!schoolSlug || schoolSlug === "superadmin") {
          const user = await prisma.user.findFirst({
            where: { email, role: "SUPER_ADMIN" },
          })
          if (!user) return null
          const ok = await bcrypt.compare(password, user.password)
          if (!ok) return null
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: "SUPER_ADMIN" as Role,
            schoolId: user.schoolId,
            schoolSlug: "superadmin",
            image: user.avatar ?? null,
          }
        }

        // ── Regular School User Login ─────────────────────────────────────
        const school = await prisma.school.findUnique({ where: { slug: schoolSlug } })
        if (!school || !school.isActive) return null

        const user = await prisma.user.findUnique({
          where: { schoolId_email: { schoolId: school.id, email } },
        })
        if (!user || !user.isActive) return null

        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
          schoolSlug: school.slug,
          image: user.avatar ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.schoolId = (user as any).schoolId
        token.schoolSlug = (user as any).schoolSlug
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
        session.user.role = token.role as Role
        session.user.schoolId = token.schoolId as string
        session.user.schoolSlug = token.schoolSlug as string
      }
      return session
    },
  },
})
