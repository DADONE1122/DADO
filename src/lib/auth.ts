import { NextAuthOptions } from "next-auth"
import EmailProvider from "next-auth/providers/email"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    verifyRequest: "/auth/verify",
  },
  providers: [
    EmailProvider({
      server: process.env.AUTH_EMAIL_SERVER
        ? process.env.AUTH_EMAIL_SERVER
        : {
            host: "smtp.resend.com",
            port: 587,
            auth: {
              user: "resend",
              pass: process.env.AUTH_RESEND_KEY,
            },
          },
      from: process.env.EMAIL_FROM || "noreply@pitopitu.it",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}