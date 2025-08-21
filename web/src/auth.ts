import NextAuth from "next-auth"
import { db } from "@/db"
import { users, teams, teamsMemberships } from "@/db/schema"
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
    /**
     * JWT Callback
     * 
     * This callback is called whenever a JSON Web Token is created (i.e. at sign in) 
     * or updated (i.e whenever a session is accessed in the client). The returned value 
     * will be encrypted, and it is stored in a cookie.
     * 
     * Requests to /api/auth/signin, /api/auth/session and calls to getSession(), 
     * getServerSession(), useSession() will invoke this function, but only if you are 
     * using a JWT session. This method is not invoked when you persist sessions in a database.
     * 
     * @see https://next-auth.js.org/configuration/callbacks
     */
    async jwt({ token, account, profile }) {
      console.log('JWT', { token, account, profile })
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account && profile) {
        // Add the GitHub access token to enable access to GitHub's APIs
        // GitHub's access_token will give you access to GitHub's APIs.
        // Self-managed providers (like Keycloak, oidc-provider, etc.) can be used to authorize against custom third-party backends.
        if (account?.provider === "github") {
          token.accessToken = account.access_token
        }
        
        // Create user if they don't exist and get their database ID
        if (profile?.email) {
          try {
            // Check if user exists
            const existingUser = await db.select().from(users).where(eq(users.email, profile.email as string)).limit(1)
            
            if (existingUser.length === 0) {
              // Create new user
              const newUser = await db.insert(users).values({
                email: profile.email as string,
                name: profile.name as string | null,
                image: profile.avatar_url as string | null
              }).returning()
              
              // Create personal team for the new user
              if (newUser.length > 0) {
                const userId = newUser[0].id
                const teamName = profile.name ? `${profile.name}'s Team` : `${profile.email.split('@')[0]}'s Team`
                
                const newTeam = await db.insert(teams).values({
                  name: teamName,
                  description: "Personal team",
                  ownerId: userId,
                }).returning()
                
                // Add user as owner in team memberships
                if (newTeam.length > 0) {
                  await db.insert(teamsMemberships).values({
                    teamId: newTeam[0].id,
                    userId: userId,
                    role: "owner",
                  })
                }
              }
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
    /**
     * Session Callback
     * 
     * The session callback is called whenever a session is checked. By default, only a 
     * subset of the token is returned for increased security. If you want to make something 
     * available you added to the token (like access_token and user.id from above) via the 
     * jwt() callback, you have to explicitly forward it here to make it available to the client.
     * 
     * e.g. getSession(), useSession(), /api/auth/session
     * 
     * When using database sessions, the User (user) object is passed as an argument.
     * When using JSON Web Tokens for sessions, the JWT payload (token) is provided instead.
     * 
     * @see https://next-auth.js.org/configuration/callbacks
     */
    async session({ session, token }) {
      console.log('session', { session, token })
      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.userId = token.id as string
      return session
    }
  }
})
