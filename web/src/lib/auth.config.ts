/**
 * This is separate from authjs because nextjs middleware **always** runs in edge runtime
 * This means we can use the database even though we only use it during dev.
 */
import { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import { NextAuthConfig } from "next-auth";
import { GITHUB_CONFIG } from "@/lib/vcs-providers";

const providers: Provider[] = [
  GitHub({
    clientId: GITHUB_CONFIG.APP_CLIENT_ID,
    clientSecret: GITHUB_CONFIG.APP_CLIENT_SECRET,
    authorization: {
      params: {
        scope: "read:user user:email read:org repo",
      },
    },
  }),
];

/**
 * Custom cookie names for development only.
 * This prevents cookie conflicts when running multiple projects locally
 * (e.g., catalyst and other Next.js apps on localhost).
 * In production, we use Auth.js defaults which have proper sameSite/secure settings.
 */
const devCookies = {
  sessionToken: {
    name: "catalyst.session-token",
  },
  callbackUrl: {
    name: "catalyst.callback-url",
  },
  csrfToken: {
    name: "catalyst.csrf-token",
  },
  pkceCodeVerifier: {
    name: "catalyst.pkce.code_verifier",
  },
  state: {
    name: "catalyst.state",
  },
  nonce: {
    name: "catalyst.nonce",
  },
};

// Notice this is only an object, not a full Auth.js instance
export default {
  providers,
  cookies: process.env.NODE_ENV === "development" ? devCookies : undefined,
} satisfies NextAuthConfig;
