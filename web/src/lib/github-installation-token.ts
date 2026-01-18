/**
 * GitHub Installation Token Generation
 *
 * Generates short-lived (1-hour) GitHub App installation tokens for
 * authenticated git operations in preview environments.
 *
 * These tokens are used by the operator's git-clone init container
 * to authenticate when cloning private repositories.
 */

import { getInstallationOctokit } from "@catalyst/vcs-provider";

export interface InstallationTokenResult {
  token: string;
  expiresAt: Date;
}

/**
 * Generate a 1-hour GitHub App installation token
 *
 * This token can be used for git operations (clone, fetch, etc.)
 * with GitHub repositories accessible by the installation.
 *
 * @param installationId - GitHub App installation ID
 * @returns Installation token and expiration time
 * @throws Error if token generation fails
 */
export async function generateInstallationToken(
  installationId: number,
): Promise<InstallationTokenResult> {
  try {
    // Get an Octokit instance authenticated as the installation
    const octokit = await getInstallationOctokit(installationId);

    // The installation Octokit already handles token generation internally
    // We need to extract the token from the auth
    const auth = (await octokit.auth({ type: "installation" })) as {
      token: string;
    };

    // GitHub App installation tokens expire after 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    return {
      token: auth.token,
      expiresAt,
    };
  } catch (error) {
    console.error(
      `Failed to generate installation token for installation ${installationId}:`,
      error,
    );
    throw new Error(
      `Failed to generate GitHub App installation token: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
