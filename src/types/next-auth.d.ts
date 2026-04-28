import { Role } from "@prisma/client"
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image?: string | null
      role: Role
      schoolId: string
      schoolSlug: string
    }
  }

  interface User {
    role: Role
    schoolId: string
    schoolSlug: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role
    schoolId: string
    schoolSlug: string
  }
}
