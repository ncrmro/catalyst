import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    GitHub({
      authorization: {
        params: {
          scope: "read:user user:email read:org repo"
        }
      }
    })
  ],
  callbacks: {
      async signIn({ user, account, profile, email, credentials }) {
        console.log('signIn', user, account, profile, email, credentials)
        return true
      },
      async redirect({ url, baseUrl }) {
        console.log('redirect', url, baseUrl)
        return baseUrl
      },
      async session({ session, user, token }) {
        console.log('session', session, user, token)
        return session
      },
      async jwt({ token, user, account, profile, isNewUser }) {
        console.log('jwt', token, user, account, profile, isNewUser)
        return token
      }
    }
})
