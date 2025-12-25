import NextAuth, { NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { sqlite } from "../database";
import { providers } from "./providers";
import { uuidv7 } from "../utils";
import { eq } from "drizzle-orm";

const { users } = sqlite;

import type { Provider } from "next-auth/providers";

/**
 * Configuration options for createAuth
 */
export interface CreateAuthConfig {
  database?: any;
  providers?: Provider[];
}

/**
 * Creates auth configuration for Node.js mode (with database)
 */
const createAuthConfigNode = (
  database: any,
  customProviders?: Provider[],
): NextAuthConfig => ({
  adapter: DrizzleAdapter(database),
  providers: customProviders ?? providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        let dbUser = await database.query.users.findFirst({
          where: eq(users.email, user.email),
        });

        if (!dbUser) {
          dbUser = await database
            .insert(users)
            .values({
              id: uuidv7(),
              email: user.email,
              name: user.name,
            })
            .returning()
            .then((res: any[]) => res[0]);
        }
        user.id = dbUser?.id;
      }
      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});

/**
 * Creates auth configuration for Edge mode (without database)
 * Suitable for use in proxy.js where database access is not available
 */
const createAuthConfigEdge = (
  customProviders?: Provider[],
): NextAuthConfig => ({
  providers: customProviders ?? providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      if (token.email) {
        session.user.email = token.email as string;
      }
      if (token.name) {
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});

/**
 * Creates NextAuth instance with optional database support
 *
 * @example Node.js mode (with database):
 * ```typescript
 * import { createAuth } from '@tetrastack/backend/auth';
 * import { database } from './database';
 *
 * export const { handlers, auth, signIn, signOut } = createAuth({ database });
 * ```
 *
 * @example Edge mode (without database):
 * ```typescript
 * import { createAuth } from '@tetrastack/backend/auth';
 *
 * export const { auth } = createAuth();
 * ```
 */
export function createAuth(
  config?: CreateAuthConfig,
): ReturnType<typeof NextAuth> {
  if (config?.database) {
    return NextAuth(createAuthConfigNode(config.database, config.providers));
  }
  return NextAuth(createAuthConfigEdge(config?.providers));
}

/**
 * Creates auth configuration based on mode
 */
export const createAuthConfig = (config?: CreateAuthConfig): NextAuthConfig => {
  if (config?.database) {
    return createAuthConfigNode(config.database, config.providers);
  }
  return createAuthConfigEdge(config?.providers);
};
