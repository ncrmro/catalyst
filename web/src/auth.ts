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
      if (account) {
        token.accessToken = account.access_token
        token.id = profile.id
        
        // Create user if they don't exist
        if (profile?.email) {
          try {
            // Check if user exists
            const existingUser = await db.select().from(users).where(eq(users.email, profile.email)).limit(1)
            
            if (existingUser.length === 0) {
              // Create new user
              await db.insert(users).values({
                email: profile.email,
                name: profile.name,
                image: profile.avatar_url
              })
            }
          } catch (error) {
            console.error('Error creating user:', error)
          }
        }
      }
      return token
    }
  }
})
