import NextAuth, { DefaultSession } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/database";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import authConfig from "@/lib/auth.config";
import Credentials from "next-auth/providers/credentials";

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

const config = {
  ...authConfig,
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" as const },
  providers: [
    ...authConfig.providers,
    // Development-only credentials provider
    ...(process.env.NODE_ENV === "development" ? [
      Credentials({
        credentials: {
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.password) return null;

          const password = credentials.password as string;
          const isAdmin = password === "admin";
          const isUser = password === "password";

          if (!isAdmin && !isUser) return null;

          const userObject = {
            id: `dev-${isAdmin ? "admin" : "user"}`,
            email: isAdmin ? "admin@example.com" : "user@example.com",
            name: isAdmin ? "Test Admin" : "Test User",
            image: "https://avatars.githubusercontent.com/u/67470890?s=200&v=4",
          };

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, userObject.email));
          
          if (user) {
            return user;
          }

          // Create new user for development
          const [newUser] = await db
            .insert(users)
            .values({
              email: userObject.email,
              name: userObject.name,
              image: userObject.image,
              admin: isAdmin,
            })
            .returning();

          return newUser;
        },
      }),
    ] : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.admin = user.admin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.admin = token.admin as boolean;
      }
      return session;
    },
  },
};

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth(config);