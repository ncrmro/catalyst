// Kubernetes GitHub OIDC Authentication Configuration management functions
import { getClusterConfig } from "./k8s-client";

export interface GitHubOIDCOptions {
	clusterAudience: string; // e.g., "https://your.cluster.aud"
}

export interface GitHubOIDCResult {
	name: string;
	created: boolean;
	exists: boolean;
}

export interface AuthenticationConfiguration {
	apiVersion: string;
	kind: string;
	jwt: Array<{
		issuer: {
			url: string;
			audiences: string[];
			audienceMatchPolicy: string;
		};
		claimMappings: {
			username: {
				claim: string;
				prefix: string;
			};
		};
	}>;
}

/**
 * Generate AuthenticationConfiguration for GitHub OIDC
 */
export function generateGitHubOIDCConfig(
	options: GitHubOIDCOptions,
): AuthenticationConfiguration {
	return {
		apiVersion: "authentication.k8s.io/v1beta1",
		kind: "AuthenticationConfiguration",
		jwt: [
			{
				issuer: {
					url: "https://token.actions.githubusercontent.com",
					audiences: [options.clusterAudience],
					audienceMatchPolicy: "MatchAny",
				},
				claimMappings: {
					username: {
						claim: "sub",
						prefix: "github:",
					},
				},
			},
		],
	};
}

/**
 * Check if GitHub OIDC is enabled for a cluster
 */
export async function isGitHubOIDCEnabled(
	clusterName?: string,
): Promise<boolean> {
	try {
		const kc = await getClusterConfig(clusterName);
		if (!kc) {
			return false;
		}

		// For now, we'll check if there's an AuthenticationConfiguration
		// In a real implementation, this would query the actual Kubernetes API
		// to check for existing AuthenticationConfiguration resources

		// This is a placeholder implementation
		// In practice, we would need to use a custom API client to check for
		// authentication.k8s.io/v1beta1 resources, which may not be available
		// in the standard client libraries

		return false; // Default to false for now
	} catch (error) {
		console.warn(
			"Failed to check GitHub OIDC status:",
			error instanceof Error ? error.message : "Unknown error",
		);
		return false;
	}
}

/**
 * Enable GitHub OIDC for a cluster
 */
export async function enableGitHubOIDC(
	options: GitHubOIDCOptions,
	clusterName?: string,
): Promise<GitHubOIDCResult> {
	const kc = await getClusterConfig(clusterName);
	if (!kc) {
		throw new Error(
			`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
		);
	}

	const configName = "github-oidc-auth";
	const authConfig = generateGitHubOIDCConfig(options);

	try {
		// Note: The AuthenticationConfiguration is a beta API and may not be available
		// in the standard Kubernetes client libraries. In a real implementation,
		// this would require custom API calls or kubectl commands.

		// For now, we'll simulate the creation and log the configuration
		console.log("GitHub OIDC AuthenticationConfiguration would be created:", {
			name: configName,
			config: authConfig,
			cluster: clusterName || "default",
		});

		// In a real implementation, you would:
		// 1. Use kubectl or a custom API client to apply the AuthenticationConfiguration
		// 2. Configure the kube-apiserver to use this authentication configuration
		// 3. Restart the kube-apiserver with the --authentication-config flag

		return {
			name: configName,
			created: true,
			exists: false,
		};
	} catch (error) {
		console.error("Failed to enable GitHub OIDC:", error);
		throw error;
	}
}

/**
 * Disable GitHub OIDC for a cluster
 */
export async function disableGitHubOIDC(
	clusterName?: string,
): Promise<GitHubOIDCResult> {
	const kc = await getClusterConfig(clusterName);
	if (!kc) {
		throw new Error(
			`Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
		);
	}

	const configName = "github-oidc-auth";

	try {
		// In a real implementation, this would remove the AuthenticationConfiguration
		// and potentially restart the kube-apiserver

		console.log("GitHub OIDC AuthenticationConfiguration would be removed:", {
			name: configName,
			cluster: clusterName || "default",
		});

		return {
			name: configName,
			created: false,
			exists: false,
		};
	} catch (error) {
		console.error("Failed to disable GitHub OIDC:", error);
		throw error;
	}
}

/**
 * Get cluster audience URL for GitHub OIDC
 * This would typically be configured per cluster
 */
export function getClusterAudience(clusterName?: string): string {
	// In a real implementation, this would be retrieved from cluster configuration
	// or environment variables specific to each cluster
	const defaultAudience = `https://${clusterName || "cluster"}.example.com`;

	// Check for environment variable first
	const envVar = clusterName
		? `CLUSTER_OIDC_AUDIENCE_${clusterName.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`
		: "CLUSTER_OIDC_AUDIENCE";
	const configuredAudience = process.env[envVar];

	return configuredAudience || defaultAudience;
}
