import NextAuth, { DefaultSession } from "next-auth";
import { db } from "@/db";
import { users, teams, teamsMemberships } from "@/db/schema";
import { eq } from "drizzle-orm";
import authConfig from "@/lib/auth.config";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      // admin: boolean;
    } & DefaultSession["user"];
  }

  // interface User {
  //     admin: boolean;
  // }

  // interface JWT {
  //     admin: boolean;
  // }
}

async function createUserWithPersonalTeam(params: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const { email, name = null, image = null } = params;

  const createdUser = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name,
        image,
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
        // Convert integer ID to string for NextAuth compatibility
        return user;
      }

      const newUser = await createUserWithPersonalTeam({
        email: userObject.email,
        name: userObject.name,
        image: userObject.image,
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
    async jwt({ token, account, profile, user }) {
      console.debug("JWT CALLBACK", { token, account, profile, user });
      // Add the GitHub access token to enable access to GitHub's APIs
      // GitHub's access_token will give you access to GitHub's APIs.
      // Self-managed providers (like Keycloak, oidc-provider, etc.) can be used to authorize against custom third-party backends.
      if (account?.provider === "github") {
        token.accessToken = account.access_token;
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
        return token;
      } else {
        const createdUser = await createUserWithPersonalTeam({
          email,
          name,
          image,
        });

        token.id = createdUser.id;
        return token;
      }
      return token;
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
    async session({ session, token, user }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string;
      session.user.id = token.id as string;
      return session;
    },
  },
});

  All routes should be authenticated via the middleware except login and logout
*/
export async function auth() {
  const session = await _auth();
  if (!session?.user) {
    throw new Error("Not authenticated!");
  }
  return session;
}
