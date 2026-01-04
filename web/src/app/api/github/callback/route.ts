import {
  auth,
  createUserWithPersonalTeam,
  createSessionToken,
  setSessionCookie,
} from "@/auth";
import { db } from "@/db";
import { githubUserTokens, users } from "@/db/schema";
import {
  exchangeAuthorizationCode,
  fetchGitHubUser,
  storeGitHubTokens,
} from "@/lib/vcs-providers";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GitHub App Installation Callback Endpoint
 *
 * Handles callbacks from GitHub after:
 * 1. App installation (with "Request user authorization during installation" enabled)
 * 2. App installation updates
 *
 * When OAuth during installation is enabled, GitHub sends:
 * - code: OAuth authorization code to exchange for tokens
 * - installation_id: The app installation ID
 * - setup_action: "install" or "update"
 *
 * This endpoint handles both:
 * - OAuth flow (when code is present): Exchange code, create/find user, store tokens
 * - Installation-only flow (existing auth): Just save installation_id
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  console.log("GitHub App callback received", {
    has_code: !!code,
    installation_id: installationId,
    setup_action: setupAction,
  });

  // OAuth during installation flow: code + installation_id
  if (code) {
    return handleOAuthInstallation(request, code, installationId);
  }

  // Fallback: installation-only flow (user already authenticated)
  return handleInstallationOnly(request, installationId);
}

/**
 * Handle OAuth during installation flow
 * This is triggered when "Request user authorization during installation" is enabled
 */
async function handleOAuthInstallation(
  request: NextRequest,
  code: string,
  installationId: string | null,
) {
  try {
    // 1. Exchange code for tokens
    console.log("Exchanging authorization code for tokens");
    const tokens = await exchangeAuthorizationCode(code);

    // 2. Fetch GitHub user profile
    console.log("Fetching GitHub user profile");
    const githubUser = await fetchGitHubUser(tokens.accessToken);

    if (!githubUser.email) {
      console.error("GitHub user has no email");
      return NextResponse.redirect(
        new URL("/auth/signin?error=no_email", request.url),
      );
    }

    // 3. Find or create user
    let user = await db
      .select()
      .from(users)
      .where(eq(users.email, githubUser.email))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      console.log("Creating new user for", githubUser.email);
      user = await createUserWithPersonalTeam({
        email: githubUser.email,
        name: githubUser.name,
        image: githubUser.avatar_url,
      });
    } else {
      console.log("Found existing user", user.id);
    }

    // 4. Store tokens with installation_id
    console.log("Storing GitHub tokens", {
      userId: user.id,
      hasInstallationId: !!installationId,
    });
    await storeGitHubTokens(user.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      installationId: installationId || undefined,
    });

    // 5. Create session cookie
    const sessionToken = await createSessionToken({
      ...user,
      email: githubUser.email, // We already verified email exists above
    });
    await setSessionCookie(sessionToken);

    console.log("OAuth installation complete", {
      userId: user.id,
      installationId,
    });

    return NextResponse.redirect(
      new URL("/account?highlight=github", request.url),
    );
  } catch (error) {
    console.error("OAuth installation failed:", error);
    return NextResponse.redirect(
      new URL("/auth/signin?error=oauth_failed", request.url),
    );
  }
}

/**
 * Handle installation-only flow (user already authenticated via Auth.js)
 */
async function handleInstallationOnly(
  request: NextRequest,
  installationId: string | null,
) {
  if (!installationId) {
    console.error("GitHub callback missing installation_id");
    return NextResponse.redirect(
      new URL("/account?error=missing_installation", request.url),
    );
  }

  try {
    const session = await auth();

    // Update the user's github_user_tokens with the installation_id
    const result = await db
      .update(githubUserTokens)
      .set({ installationId, updatedAt: new Date() })
      .where(eq(githubUserTokens.userId, session.user.id))
      .returning();

    if (result.length === 0) {
      console.error(
        "No github_user_tokens record found for user",
        session.user.id,
      );
      return NextResponse.redirect(
        new URL("/account?error=no_token_record", request.url),
      );
    }

    console.log("GitHub App installation saved", {
      userId: session.user.id,
      installationId,
    });

    return NextResponse.redirect(
      new URL("/account?highlight=github", request.url),
    );
  } catch (error) {
    console.error("GitHub callback error:", error);
    return NextResponse.redirect(
      new URL("/account?error=callback_failed", request.url),
    );
  }
}
