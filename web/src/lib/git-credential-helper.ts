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
 * This is provided for reference or for use cases where the script needs to be
 * dynamically distributed (e.g., via ConfigMap creation).
 *
 * For production use, the script should be included in the container image or
 * mounted as a ConfigMap, and pods should reference it directly rather than
 * embedding it in init commands.
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to read git credential helper script:", error);
    throw new Error(
      `Could not load git credential helper script at ${scriptPath}: ${errorMessage}`,
    );
  }
}

/**
 * Generate init container commands for setting up git with credential helper
 *
 * This generates the shell commands needed to:
 * 1. Copy the credential helper script to the pod
 * 2. Make it executable
 * 3. Configure git to use the helper
 * 4. Optionally clone a repository
 *
 * Note: The credential helper script should be mounted as a ConfigMap or
 * copied into the container image. This function assumes the script is
 * available at a known location or can be copied.
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
  const {
    installationId,
    repoUrl,
    commitSha,
    targetDir = "/workspace",
  } = options;

  // Load the credential helper script content so we can embed it into the init commands
  // if the script is not already present in the container image.
  const credentialHelperScriptContent = getCredentialHelperScript().replace(
    /\$/g,
    "\\$",
  );

  return `
set -e

echo "=== Setting up Git Credential Helper ==="

# The credential helper script should ideally be available in the container,
# either pre-installed in the image or mounted as a ConfigMap. If it is not
# present, we will install it from an embedded copy.

# Ensure the script is present and executable
if [ -f /usr/local/bin/git-credential-catalyst ]; then
  chmod +x /usr/local/bin/git-credential-catalyst
  echo "✓ Credential helper found and made executable"
else
  echo "⚠ Credential helper not found at /usr/local/bin/git-credential-catalyst"
  echo "   Installing embedded credential helper script to /usr/local/bin/git-credential-catalyst"
  cat <<'CATALYST_CREDENTIAL_HELPER_EOF' >/usr/local/bin/git-credential-catalyst
${credentialHelperScriptContent}
CATALYST_CREDENTIAL_HELPER_EOF
  chmod +x /usr/local/bin/git-credential-catalyst
  echo "✓ Embedded credential helper script installed and made executable"
fi

# Configure git to use the credential helper
git config --global credential.helper /usr/local/bin/git-credential-catalyst
echo "✓ Git configured to use credential helper"

# The INSTALLATION_ID environment variable should be set by the pod spec
# Verify it's present
if [ -z "\${INSTALLATION_ID}" ]; then
  echo "⚠ Warning: INSTALLATION_ID environment variable not set"
  echo "   Set it in the pod spec: INSTALLATION_ID=${installationId}"
fi

echo "✓ Git credential helper setup complete"

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
