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
        if (!credentials?.email || !credentials?.password || !credentials?.schoolSlug) {
          return null
        }

        const school = await prisma.school.findUnique({
          where: { slug: credentials.schoolSlug as string },
        })

        if (!school || !school.isActive) return null

        const user = await prisma.user.findUnique({
          where: {
            schoolId_email: {
              schoolId: school.id,
              email: credentials.email as string,
            },
          },
        })

        if (!user || !user.isActive) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordMatch) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
          schoolSlug: school.slug,
          image: user.avatar,
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
