import NextAuth, { DefaultSession } from "next-auth"
import { db } from "@/db"
import { users, teams, teamsMemberships } from "@/db/schema"
import { eq } from "drizzle-orm"
import authConfig from "@/lib/auth.config"
import Credentials from "next-auth/providers/credentials"

declare module 'next-auth' {
  interface Session {
      user: {
          id: string;
          // admin: boolean;
      } & DefaultSession['user'];
  }
  
  // interface User {
  //     admin: boolean;
  // }
  
  // interface JWT {
  //     admin: boolean;
  // }
}

authConfig.providers.push(
    Credentials({
      id: "password",
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        /**
         * In development users can sign in with either password or admin as a password
         * Supports suffixed usernames like "password-user1" or "admin-user2" for E2E testing
         */
        const password = credentials.password as string;
        
        // Parse password to extract base type and optional suffix
        const passwordMatch = password.match(/^(password|admin)(?:-(.*))?$/);
        if (!passwordMatch) {
          return null;
        }
        
        const [, baseType, suffix] = passwordMatch;
        const isAdmin = baseType === "admin";
        
        // For backward compatibility, use original emails for legacy passwords
        const isLegacy = suffix === undefined;
        const userSuffix = isLegacy ? (isAdmin ? "admin" : "user") : suffix;
        
        const userObject = {
            id: `dev-${isAdmin ? "admin" : "user"}-${userSuffix}`,
            email: isLegacy 
              ? (isAdmin ? "admin@example.com" : "bob@alice.com")
              : (isAdmin ? `admin-${userSuffix}@example.com` : `user-${userSuffix}@example.com`),
            name: isLegacy
              ? (isAdmin ? "Test Admin" : "Bob Alice")
              : (isAdmin ? `Test Admin ${userSuffix}` : `Test User ${userSuffix}`),
            image: "https://avatars.githubusercontent.com/u/67470890?s=200&v=4",
          }
        
        const [user] = await db.select().from(users).where(eq(users.email, userObject.email));
        if (user) {
          // Convert integer ID to string for NextAuth compatibility
          return {
            ...user,
            id: user.id.toString(),
            // admin: user.admin ?? false // Handle potential null admin value
          };
        }
        
        const [newUser] = await db.insert(users).values({
          email: userObject.email,
          name: userObject.name,
          image: userObject.image,
          // admin: isAdmin,
        }).returning();
        // Convert integer ID to string for NextAuth compatibility
        // Next auth expects id to be a string (UUID) but I stubbornly used an integer
        return {
          ...newUser,
          id: newUser.id.toString(),
          // admin: newUser.admin ?? false // Handle potential null admin value
        };
      },
    })
)

export const { handlers, signIn, signOut, auth: _auth } = NextAuth({
  ...authConfig,
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

/*
  All routes should be authenticaated via the middleware except login and logout
*/
export async function auth() {
  const session = await _auth();
  if (!session?.user) {
    throw new Error("Not authenticated!");
  }
  return session;
}