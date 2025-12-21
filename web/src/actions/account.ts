"use server";

/**
 * Server actions for account management and provider connections
 */

import { auth } from "@/auth";
import { getUserOctokit, GITHUB_CONFIG } from "@/lib/github";

export interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  error?: string;
  authMethod?: "oauth" | "pat";
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
}

/**
 * Check if the current user has a valid GitHub connection
 * Makes a lightweight API call to verify the token works
 * Supports both OAuth tokens and PAT fallback
 */
export async function checkGitHubConnection(): Promise<GitHubConnectionStatus> {
  const session = await auth();

  try {
    // getUserOctokit handles PAT fallback automatically
    const octokit = await getUserOctokit(session.user.id);

    // Use the /user endpoint - lightweight and verifies token validity
    const { data } = await octokit.rest.users.getAuthenticated();

    // Determine auth method based on what's available
    const authMethod = session.accessToken
      ? "oauth"
      : GITHUB_CONFIG.PAT
        ? "pat"
        : undefined;

    return {
      connected: true,
      username: data.login,
      avatarUrl: data.avatar_url,
      authMethod,
    };
  } catch (error) {
    console.error("GitHub connection check failed:", error);
    return {
      connected: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to verify GitHub connection",
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
