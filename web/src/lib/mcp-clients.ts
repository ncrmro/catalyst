import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { GITHUB_CONFIG } from "@/lib/vcs-providers";

/**
 * GitHub MCP Client configuration and initialization
 *
 * This module provides access to GitHub's MCP (Model Context Protocol) server
 * which offers tools for GitHub repository interactions, issue management,
 * pull request analysis, and other GitHub-related functionality.
 */

export interface GitHubMCPClientOptions {
	apiKey?: string;
	baseUrl?: string;
	accessToken?: string;
}

export class GitHubMCPClient {
	private client: Awaited<ReturnType<typeof createMCPClient>> | null = null;
	private options: GitHubMCPClientOptions;
	private isInitialized = false;

	constructor(options: GitHubMCPClientOptions = {}) {
		this.options = {
			baseUrl: "https://api.githubcopilot.com/mcp/",
			...options,
		};
	}

	/**
	 * Initialize the MCP client connection
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized && this.client) {
			return;
		}

		try {
			const transportConfig: {
				type: "sse";
				url: string;
				headers?: Record<string, string>;
			} = {
				type: "sse",
				url: this.options.baseUrl!,
			};

			// Add authentication headers if API key or access token is provided
			if (this.options.apiKey) {
				transportConfig.headers = {
					Authorization: `Bearer ${this.options.apiKey}`,
				};
			} else if (this.options.accessToken) {
				transportConfig.headers = {
					Authorization: `Bearer ${this.options.accessToken}`,
				};
			}

			this.client = await createMCPClient({
				transport: transportConfig,
			});
			this.isInitialized = true;
		} catch (error) {
			console.warn("Failed to initialize GitHub MCP client:", error);
			this.client = null;
			this.isInitialized = false;
		}
	}

	/**
	 * Get available tools from the GitHub MCP server
	 */
	async getTools(): Promise<Record<string, unknown>> {
		await this.initialize();

		if (!this.client) {
			return {};
		}

		try {
			return await this.client.tools();
		} catch (error) {
			console.warn("Failed to fetch GitHub MCP tools:", error);
			return {};
		}
	}

	/**
	 * Get the MCP client instance (after initialization)
	 */
	async getClient() {
		await this.initialize();
		return this.client;
	}

	/**
	 * Check if the client is available and initialized
	 */
	isAvailable(): boolean {
		return this.isInitialized && this.client !== null;
	}

	/**
	 * Reset the client connection
	 */
	reset(): void {
		this.client = null;
		this.isInitialized = false;
	}
}

// Default GitHub MCP client instance
let defaultGitHubMCPClient: GitHubMCPClient | null = null;

/**
 * Get the default GitHub MCP client instance
 * This function creates a singleton instance for the application
 * For session-based authentication, prefer creating new instances with session access tokens
 */
export function getGitHubMCPClient(
	options?: GitHubMCPClientOptions,
): GitHubMCPClient {
	if (!defaultGitHubMCPClient) {
		defaultGitHubMCPClient = new GitHubMCPClient({
			apiKey: GITHUB_CONFIG.MCP_API_KEY,
			...options,
		});
	}
	return defaultGitHubMCPClient;
}

/**
 * Create a new GitHub MCP client instance with session-based authentication
 * This is the preferred method when using user sessions
 */
export function createGitHubMCPClient(
	options: GitHubMCPClientOptions,
): GitHubMCPClient {
	return new GitHubMCPClient(options);
}

/**
 * Reset the default GitHub MCP client (useful for testing)
 */
export function resetGitHubMCPClient(): void {
	if (defaultGitHubMCPClient) {
		defaultGitHubMCPClient.reset();
		defaultGitHubMCPClient = null;
	}
}
