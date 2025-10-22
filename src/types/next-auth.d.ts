import { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    userType?: string
    user: {
      id: string
      email: string
      name: string
      role: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    userType?: string
    accessToken?: string
    refreshToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    email?: string
    name?: string
    role?: string
    userType?: string
    accessToken?: string
    refreshToken?: string
  }
}
