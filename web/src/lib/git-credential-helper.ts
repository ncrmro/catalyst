/**
 * Git Credential Helper Library
 *
 * This module provides utilities for setting up git credential helpers in
 * Kubernetes pods, enabling fresh GitHub token authentication for git operations.
 *
 * Based on: specs/001-environments/research.git-credential-helper.md
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Get the git credential helper script content
 *
 * This reads the shell script from the scripts directory and returns it as a string.
 * The script will be embedded in pod init containers to configure git authentication.
 */
export function getCredentialHelperScript(): string {
  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "git-credential-catalyst.sh",
  );

  try {
    return fs.readFileSync(scriptPath, "utf-8");
  } catch (error) {
    console.error("Failed to read git credential helper script:", error);
    throw new Error(
      "Could not load git credential helper script. Ensure scripts/git-credential-catalyst.sh exists.",
    );
  }
}

/**
 * Generate init container commands for setting up git with credential helper
 *
 * This generates the shell commands needed to:
 * 1. Install the git credential helper script
 * 2. Make it executable
 * 3. Configure git to use the helper
 * 4. Optionally clone a repository
 *
 * @param options Configuration for the init container
 * @returns Shell command string for the init container
 */
export function generateGitCredentialHelperInitCommands(options: {
  installationId: number;
  repoUrl?: string;
  commitSha?: string;
  targetDir?: string;
}): string {
  const { installationId, repoUrl, commitSha, targetDir = "/workspace" } =
    options;

  const helperScript = getCredentialHelperScript();

  return `
set -e

echo "=== Setting up Git Credential Helper ==="

# Install credential helper script
cat > /usr/local/bin/git-credential-catalyst <<'HELPER_SCRIPT'
${helperScript}
HELPER_SCRIPT

chmod +x /usr/local/bin/git-credential-catalyst
echo "✓ Credential helper installed at /usr/local/bin/git-credential-catalyst"

# Configure git to use the credential helper
git config --global credential.helper /usr/local/bin/git-credential-catalyst
echo "✓ Git configured to use credential helper"

# Set installation ID for the helper to use
export INSTALLATION_ID=${installationId}
echo "✓ Installation ID set to ${installationId}"

${
  repoUrl
    ? `
echo ""
echo "=== Cloning Repository ==="
echo "Repository: ${repoUrl}"
${commitSha ? `echo "Commit SHA: ${commitSha}"` : ""}
echo "Target: ${targetDir}"

git clone ${repoUrl} ${targetDir}
${
  commitSha
    ? `
cd ${targetDir}
git checkout ${commitSha}
echo "✓ Checked out commit ${commitSha}"
`
    : ""
}

echo "✓ Repository cloned successfully"
`
    : ""
}

echo ""
echo "=== Git Setup Complete ==="
`;
}

/**
 * Create init container spec for git credential helper setup
 *
 * This creates a Kubernetes init container specification that sets up
 * the git credential helper and optionally clones a repository.
 *
 * @param options Configuration for the init container
 * @returns Kubernetes init container spec object
 */
export function createGitCredentialHelperInitContainer(options: {
  name?: string;
  installationId: number;
  repoUrl?: string;
  commitSha?: string;
  targetDir?: string;
  volumeMountName?: string;
  image?: string;
}) {
  const {
    name = "setup-git",
    installationId,
    repoUrl,
    commitSha,
    targetDir = "/workspace",
    volumeMountName = "code",
    image = "alpine/git:latest",
  } = options;

  const commands = generateGitCredentialHelperInitCommands({
    installationId,
    repoUrl,
    commitSha,
    targetDir,
  });

  return {
    name,
    image,
    command: ["/bin/sh", "-c"],
    args: [commands],
    env: [
      {
        name: "INSTALLATION_ID",
        value: installationId.toString(),
      },
    ],
    volumeMounts: [
      {
        name: volumeMountName,
        mountPath: targetDir,
      },
    ],
  };
}

/**
 * Generate environment variable for installation ID
 *
 * This creates an environment variable spec for pods that need to use
 * the git credential helper. The installation ID is used by the helper
 * to fetch the correct GitHub token.
 *
 * @param installationId GitHub App installation ID
 * @returns Kubernetes environment variable spec
 */
export function createInstallationIdEnvVar(installationId: number) {
  return {
    name: "INSTALLATION_ID",
    value: installationId.toString(),
  };
}

/**
 * Create pod labels for installation tracking
 *
 * These labels help the web server identify which installation a pod belongs to
 * when validating ServiceAccount tokens for credential requests.
 *
 * @param installationId GitHub App installation ID
 * @returns Object with label key-value pairs
 */
export function createInstallationIdLabels(installationId: number) {
  return {
    "catalyst.dev/installation-id": installationId.toString(),
  };
}
