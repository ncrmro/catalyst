import { auth } from "@/auth";
import { db } from "@/db";
import { githubUserTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GitHub App Installation Callback Endpoint
 *
 * Handles the callback from GitHub after a user installs the GitHub App.
 * This is separate from the Auth.js OAuth callback (/api/auth/callback/github).
 *
 * Flow:
 * 1. User clicks "Install GitHub App" button
 * 2. User is redirected to GitHub to install the app
 * 3. GitHub redirects back here with installation_id
 * 4. We save the installation_id to the user's github_user_tokens record
 * 5. User is redirected to /account with the GitHub provider highlighted
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  // Log the callback for debugging
  console.log("GitHub App callback received", {
    installation_id: installationId,
    setup_action: setupAction,
  });

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
