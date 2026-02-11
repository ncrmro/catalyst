"use server";

/**
 * Server actions for account management and provider connections
 */

import { auth } from "@/auth";
import { db } from "@/db";
import { githubUserTokens } from "@/db/schema";
import { getGitHubTokens, isGitHubOAuthConfigured } from "@/lib/vcs-providers";
import { vcs } from "@/lib/vcs";
import { eq } from "drizzle-orm";

export interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  error?: string;
  authMethod?: "oauth" | "pat";
  hasGitHubApp?: boolean;
  oauthConfigured?: boolean; // Whether OAuth credentials are properly configured
}

export interface ProviderStatus {
  id: string;
  name: string;
  icon: "github" | "gitlab" | "bitbucket" | "azure";
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  error?: string;
  available: boolean; // Whether the provider integration is implemented
  authMethod?: "oauth" | "pat";
  hasGitHubApp?: boolean;
  oauthConfigured?: boolean; // Whether OAuth credentials are properly configured
}

/**
 * Check if the current user has a valid GitHub connection
 * Uses VCS provider abstraction to verify token validity
 * Supports both OAuth tokens and PAT fallback
 */
export async function checkGitHubConnection(): Promise<GitHubConnectionStatus> {
  const session = await auth();

  if (!session?.user?.id) {
    return { connected: false, error: "Not authenticated" };
  }

  // Check if OAuth credentials are configured
  const oauthConfigured = isGitHubOAuthConfigured();

  try {
    const scopedVcs = vcs.getScoped(session.user.id, "github");
    const status = await scopedVcs.checkConnection();

    // Check if GitHub App is installed by looking for installationId
    const tokens = await getGitHubTokens(session.user.id);
    const hasGitHubApp = !!tokens?.installationId;

    return {
      connected: status.connected,
      username: status.username,
      avatarUrl: status.avatarUrl,
      error: status.error,
      authMethod: status.authMethod === "app" ? "oauth" : status.authMethod, // Map "app" to "oauth" for UI
      hasGitHubApp,
      oauthConfigured,
    };
  } catch (error) {
    console.error("GitHub connection check failed:", error);
    return {
      connected: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to verify GitHub connection",
      oauthConfigured,
    };
  }
}

/**
 * Get status of all version control providers
 * Only GitHub is actually connected; others are mocked as "coming soon"
 */
export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const githubStatus = await checkGitHubConnection();

  return [
    {
      id: "github",
      name: "GitHub",
      icon: "github",
      connected: githubStatus.connected,
      username: githubStatus.username,
      avatarUrl: githubStatus.avatarUrl,
      error: githubStatus.error,
      available: true,
      authMethod: githubStatus.authMethod,
      hasGitHubApp: githubStatus.hasGitHubApp,
      oauthConfigured: githubStatus.oauthConfigured,
    },
    {
      id: "gitlab",
      name: "GitLab",
      icon: "gitlab",
      connected: false,
      available: false,
    },
    {
      id: "bitbucket",
      name: "Bitbucket",
      icon: "bitbucket",
      connected: false,
      available: false,
    },
    {
      id: "azure-devops",
      name: "Azure DevOps",
      icon: "azure",
      connected: false,
      available: false,
    },
  ];
}

export interface GitHubAppInstallationStatus {
  hasAppInstalled: boolean;
  connected: boolean;
}

/**
 * Check if the current user has the GitHub App installed
 * Used by the dashboard banner to prompt users to install the app
 *
 * Note: This queries the database directly rather than using getGitHubTokens()
 * because getGitHubTokens requires valid decryptable tokens. We just need to
 * check if the record exists (connected via OAuth) and has an installationId.
 */
export async function checkGitHubAppInstallation(): Promise<GitHubAppInstallationStatus> {
  const session = await auth();

  if (!session?.user?.id) {
    return { hasAppInstalled: false, connected: false };
  }

  try {
    const tokenRecord = await db
      .select({
        installationId: githubUserTokens.installationId,
      })
      .from(githubUserTokens)
      .where(eq(githubUserTokens.userId, session.user.id))
      .limit(1);

    const record = tokenRecord[0];

    return {
      // User is connected if they have a token record (created during OAuth sign-in)
      connected: !!record,
      // App is installed if they have an installation ID
      hasAppInstalled: !!record?.installationId,
    };
  } catch (error) {
    console.error("GitHub App installation check failed:", error);
    return {
      hasAppInstalled: false,
      connected: false,
    };
  }
}
