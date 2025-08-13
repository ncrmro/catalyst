import NextAuth from "next-auth"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
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
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account && profile) {
        token.accessToken = account.access_token
        
        // Create user if they don't exist and get their database ID
        if (profile?.email) {
          try {
            // Check if user exists
            const existingUser = await db.select().from(users).where(eq(users.email, profile.email as string)).limit(1)
            
            if (existingUser.length === 0) {
              // Create new user
              await db.insert(users).values({
                email: profile.email as string,
                name: profile.name as string | null,
                image: profile.avatar_url as string | null
              })
            }
            
            // Get the user from database to set token.id to database user ID
            const user = await db.select().from(users).where(eq(users.email, profile.email as string)).limit(1)
            if (user.length > 0) {
              token.id = user[0].id
            }
          } catch (error) {
            console.error('Error creating user:', error)
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.userId = token.id as string
      return session
    }
  }
})
