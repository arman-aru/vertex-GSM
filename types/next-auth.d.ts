import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      resellerId: string
      balance: number
    } & DefaultSession["user"]
  }

  interface User {
    role: UserRole
    resellerId: string
    balance: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    resellerId: string
    balance: number
  }
}
