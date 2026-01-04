/**
 * Session Helper Factory
 *
 * Creates session token and cookie management functions for use outside
 * the normal Auth.js flow. This is useful for:
 *
 * 1. VCS webhook callbacks (e.g., GitHub App installation with OAuth)
 * 2. Programmatic session creation in Playwright tests
 * 3. Any scenario where you need to create a session without going through
 *    the standard Auth.js sign-in flow
 */

import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";

/**
 * User data required to create a session token
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  admin?: boolean;
  /** Additional custom properties to include in the token */
  [key: string]: unknown;
}

/**
 * Configuration for the session helper factory
 */
export interface SessionHelperConfig {
  /**
   * Cookie name to use for the session.
   * @default "authjs.session-token"
   */
  cookieName?: string;

  /**
   * Whether to set the secure flag on the cookie (requires HTTPS).
   * @default true when NODE_ENV === "production", false otherwise
   */
  secure?: boolean;

  /**
   * Session duration in seconds.
   * @default 2592000 (30 days)
   */
  maxAge?: number;

  /**
   * Auth secret. If not provided, reads from AUTH_SECRET or NEXTAUTH_SECRET env vars.
   */
  secret?: string;
}

/**
 * Return type of createSessionHelpers
 */
export interface SessionHelpers {
  /**
   * Create a JWT session token for a user.
   * This token can be set as a cookie to authenticate the user.
   */
  createSessionToken: (user: SessionUser) => Promise<string>;

  /**
   * Set the session cookie with the provided token.
   * Uses Next.js cookies() API - only works in Server Components/Actions/Route Handlers.
   */
  setSessionCookie: (sessionToken: string) => Promise<void>;

  /**
   * Convenience method: create token and set cookie in one call.
   */
  createAndSetSession: (user: SessionUser) => Promise<string>;

  /**
   * Get the cookie name being used (useful for Playwright tests).
   */
  getCookieName: () => string;
}

/**
 * Creates session helper functions with the provided configuration.
 *
 * @example VCS Webhook Callback (GitHub App installation):
 * ```typescript
 * import { createSessionHelpers } from '@tetrastack/backend/auth';
 *
 * const isProduction = process.env.NODE_ENV === 'production';
 * const { createAndSetSession } = createSessionHelpers({
 *   cookieName: isProduction ? '__Secure-authjs.session-token' : 'myapp.session-token',
 * });
 *
 * // In your webhook callback route:
 * export async function GET(request: NextRequest) {
 *   const user = await findOrCreateUser(githubProfile);
 *   await createAndSetSession({
 *     id: user.id,
 *     email: user.email,
 *     name: user.name,
 *     image: user.image,
 *     admin: user.admin,
 *   });
 *   return NextResponse.redirect('/dashboard');
 * }
 * ```
 *
 * @example Playwright Test (programmatic login):
 * ```typescript
 * import { createSessionHelpers } from '@tetrastack/backend/auth';
 *
 * const { createSessionToken, getCookieName } = createSessionHelpers({
 *   cookieName: 'myapp.session-token',
 *   secret: 'test-secret-for-playwright',
 * });
 *
 * async function loginAsUser(page: Page, user: TestUser) {
 *   const token = await createSessionToken(user);
 *   const cookieName = getCookieName();
 *
 *   await page.context().addCookies([{
 *     name: cookieName,
 *     value: token,
 *     domain: 'localhost',
 *     path: '/',
 *     httpOnly: true,
 *     secure: false,
 *     sameSite: 'Lax',
 *   }]);
 * }
 * ```
 */
export function createSessionHelpers(
  config: SessionHelperConfig = {},
): SessionHelpers {
  const {
    cookieName = "authjs.session-token",
    secure = process.env.NODE_ENV === "production",
    maxAge = 30 * 24 * 60 * 60, // 30 days
    secret: configSecret,
  } = config;

  const getSecret = (): string => {
    const secret =
      configSecret || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is not set");
    }
    return secret;
  };

  const getCookieName = (): string => cookieName;

  const createSessionToken = async (user: SessionUser): Promise<string> => {
    const secret = getSecret();

    // Extract known properties and spread the rest
    const { id, email, name, image, admin, ...rest } = user;

    const token = await encode({
      token: {
        id,
        email,
        name,
        picture: image,
        admin: admin ?? false,
        ...rest,
      },
      secret,
      salt: cookieName, // Salt must match the cookie name for Auth.js
      maxAge,
    });

    return token;
  };

  const setSessionCookie = async (sessionToken: string): Promise<void> => {
    const cookieStore = await cookies();

    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  };

  const createAndSetSession = async (user: SessionUser): Promise<string> => {
    const token = await createSessionToken(user);
    await setSessionCookie(token);
    return token;
  };

  return {
    createSessionToken,
    setSessionCookie,
    createAndSetSession,
    getCookieName,
  };
}
