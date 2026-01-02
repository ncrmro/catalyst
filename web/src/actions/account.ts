"use server";

/**
 * Server actions for account management and provider connections
 */

import { auth } from "@/auth";
import { providerRegistry } from "@/lib/vcs-providers";

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
 * Uses VCS provider abstraction to verify token validity
 * Supports both OAuth tokens and PAT fallback
 */
export async function checkGitHubConnection(): Promise<GitHubConnectionStatus> {
	const session = await auth();

	try {
		const provider = providerRegistry.getDefault();
		const status = await provider.checkConnection(session.user.id);

		return {
			connected: status.connected,
			username: status.username,
			avatarUrl: status.avatarUrl,
			error: status.error,
			authMethod: status.authMethod === "app" ? "oauth" : status.authMethod, // Map "app" to "oauth" for UI
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
