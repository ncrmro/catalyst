/**
 * Git Credential Helper Library
 *
 * This module provides utilities for setting up git credential helpers in
 * Kubernetes pods, enabling fresh GitHub token authentication for git operations.
 *
 * The credential helper script is provided by the operator via ConfigMap.
 * The operator embeds the scripts at compile time and creates a ConfigMap
 * in each namespace.
 *
 * Based on: specs/001-environments/research.git-credential-helper.md
 */

/**
 * Generate init container commands for setting up git with credential helper
 *
 * This generates the shell commands needed to:
 * 1. Configure git to use the credential helper (provided by operator via ConfigMap)
 * 2. Optionally clone a repository
 *
 * The credential helper script is provided by the operator via ConfigMap and
 * mounted at /scripts/git-credential-catalyst.sh. The operator creates this
 * ConfigMap in each namespace using scripts embedded at compile time.
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

  return `
set -e

echo "=== Setting up Git Credential Helper ==="

# The credential helper script is provided by the operator via ConfigMap
# and should be mounted at /scripts/git-credential-catalyst.sh
if [ ! -f /scripts/git-credential-catalyst.sh ]; then
  echo "Error: Credential helper script not found at /scripts/git-credential-catalyst.sh"
  echo "Ensure the catalyst-git-scripts ConfigMap is mounted in the pod"
  exit 1
fi

# Copy script to a standard location and make it executable
cp /scripts/git-credential-catalyst.sh /usr/local/bin/git-credential-catalyst
chmod +x /usr/local/bin/git-credential-catalyst
echo "✓ Credential helper script installed"

# Configure git to use the credential helper
git config --global credential.helper /usr/local/bin/git-credential-catalyst
echo "✓ Git configured to use credential helper"

# Verify INSTALLATION_ID environment variable is set
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

git clone "${repoUrl}" "${targetDir}"
${
  commitSha
    ? `
cd "${targetDir}"
git checkout "${commitSha}"
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
 * the git credential helper (provided by operator via ConfigMap) and
 * optionally clones a repository.
 *
 * The catalyst-git-scripts ConfigMap should be mounted at /scripts.
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
    image = "alpine/git:2.45.2",
  } = options;

  const commands = generateGitCredentialHelperInitCommands({
    installationId,
    repoUrl,
    commitSha,
    targetDir,
  });

  const webUrl =
    process.env.CATALYST_WEB_URL ||
    "http://catalyst-web.catalyst-system.svc.cluster.local:3000";

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
      {
        name: "CATALYST_WEB_URL",
        value: webUrl,
      },
    ],
    volumeMounts: [
      {
        name: volumeMountName,
        mountPath: targetDir,
      },
      {
        name: "git-scripts",
        mountPath: "/scripts",
        readOnly: true,
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
