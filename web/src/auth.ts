import NextAuth, { DefaultSession } from "next-auth";
import { db } from "@/db";
import { users, teams, teamsMemberships } from "@/db/schema";
import { eq } from "drizzle-orm";
import authConfig from "@/lib/auth.config";
import Credentials from "next-auth/providers/credentials";
import { createSessionHelpers } from "@tetrastack/backend/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      admin: boolean;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User {
    admin: boolean;
  }

  interface JWT {
    admin: boolean;
  }
}

async function createUserWithPersonalTeam(params: {
  email: string;
  name?: string | null;
  image?: string | null;
  admin?: boolean;
}) {
  const { email, name = null, image = null, admin = false } = params;

  const createdUser = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name,
        image,
        admin,
      })
      .returning();

    const teamName = name ? `${name}'s Team` : `${email.split("@")[0]}'s Team`;

    const [team] = await tx
      .insert(teams)
      .values({
        name: teamName,
        description: "Personal team",
        ownerId: newUser.id,
      })
      .returning();

    await tx.insert(teamsMemberships).values({
      teamId: team.id,
      userId: newUser.id,
      role: "owner",
    });

    return newUser;
  });

  return createdUser;
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
          ? isAdmin
            ? "admin@example.com"
            : "bob@alice.com"
          : isAdmin
            ? `admin-${userSuffix}@example.com`
            : `user-${userSuffix}@example.com`,
        name: isLegacy
          ? isAdmin
            ? "Test Admin"
            : "Bob Alice"
          : isAdmin
            ? `Test Admin ${userSuffix}`
            : `Test User ${userSuffix}`,
        image: "https://avatars.githubusercontent.com/u/67470890?s=200&v=4",
      };

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userObject.email));
      if (user) {
        // Update admin status if it has changed based on password type
        if (user.admin !== isAdmin) {
          const [updatedUser] = await db
            .update(users)
            .set({ admin: isAdmin })
            .where(eq(users.id, user.id))
            .returning();
          return updatedUser;
        }
        return user;
      }

      const newUser = await createUserWithPersonalTeam({
        email: userObject.email,
        name: userObject.name,
        image: userObject.image,
        admin: isAdmin,
      });
      // Convert integer ID to string for NextAuth compatibility
      // Next auth expects id to be a string (UUID) but I stubbornly used an integer
      return newUser;
    },
  }),
);

export const {
  handlers,
  signIn,
  signOut,
  auth: _auth,
} = NextAuth({
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
    async jwt({ token, account }) {
      // Handle GitHub App authentication
      if (account?.provider === "github") {
        // Store the refresh token and access token from GitHub App
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.tokenExpiresAt = account.expires_at;
        token.tokenScope = account.scope;
      }
      const { email, name, picture: image } = token;
      // Persist the OAuth access_token and or the user id to the token right after signin

      if (!email) {
        throw new Error("No email found during JWT callback");
      }
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existingUser) {
        token.id = existingUser.id;
        token.admin = existingUser.admin;

        // Store GitHub App tokens in database if we have them (initial signin)
        if (
          account?.provider === "github" &&
          token.accessToken &&
          token.refreshToken
        ) {
          const { storeGitHubTokens } = await import("@/lib/vcs-providers");

          // Calculate expiration time (8 hours for GitHub App tokens)
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 8);

          await storeGitHubTokens(existingUser.id, {
            accessToken: token.accessToken as string,
            refreshToken: token.refreshToken as string,
            expiresAt,
            scope: (token.tokenScope as string) || "",
          });
        } else if (!account) {
          // Not a fresh signin - check if we need to refresh GitHub tokens
          // This runs on every session access to keep tokens fresh
          try {
            const { refreshTokenIfNeeded } = await import(
              "@catalyst/vcs-provider"
            );
            const refreshedTokens = await refreshTokenIfNeeded(existingUser.id);

            // If tokens were refreshed, update the JWT token
            if (refreshedTokens) {
              token.accessToken = refreshedTokens.accessToken;
              token.refreshToken = refreshedTokens.refreshToken;
              if (refreshedTokens.expiresAt) {
                token.tokenExpiresAt = Math.floor(
                  refreshedTokens.expiresAt.getTime() / 1000,
                );
              }
              token.tokenScope = refreshedTokens.scope;
            }
          } catch (error) {
            // Log error but don't fail the session - user can still use the app
            console.error("Failed to refresh GitHub tokens in JWT callback:", error);
          }
        }

        return token;
      } else {
        const createdUser = await createUserWithPersonalTeam({
          email,
          name,
          image,
        });

        token.id = createdUser.id;
        token.admin = createdUser.admin;

        // Store GitHub App tokens in database if we have them
        if (
          account?.provider === "github" &&
          token.accessToken &&
          token.refreshToken
        ) {
          const { storeGitHubTokens } = await import("@/lib/vcs-providers");

          // Calculate expiration time (8 hours for GitHub App tokens)
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 8);

          await storeGitHubTokens(createdUser.id, {
            accessToken: token.accessToken as string,
            refreshToken: token.refreshToken as string,
            expiresAt,
            scope: (token.tokenScope as string) || "",
          });
        }

        return token;
      }
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
      // Send properties to the client
      session.accessToken = token.accessToken as string;
      session.user.id = token.id as string;
      session.user.admin = token.admin as boolean;
      return session;
    },
  },
});

/*
  All routes should be authenticated via the middleware except login and logout
*/
export async function auth() {
  const session = await _auth();
  if (!session?.user) {
    throw new Error("Not authenticated!");
  }
  return session;
}

// Export for use in GitHub App callback
export { createUserWithPersonalTeam };

/**
 * Session helpers for programmatic session creation.
 * Used by VCS webhook callbacks (e.g., GitHub App installation with OAuth).
 *
 * Cookie name matches Auth.js configuration from auth.config.ts
 */
const isProduction = process.env.NODE_ENV === "production";
const sessionCookieName = isProduction
  ? "__Secure-authjs.session-token"
  : "catalyst.session-token";

export const {
  createSessionToken,
  setSessionCookie,
  createAndSetSession,
  getCookieName,
} = createSessionHelpers({ cookieName: sessionCookieName });
