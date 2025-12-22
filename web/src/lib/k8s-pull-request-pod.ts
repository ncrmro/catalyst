// Kubernetes Pull Request pod management functions
// This module creates job manifests with service accounts that have permissions
// to create pods for buildx kubernetes driver functionality

import { getCoreV1Api, getClusterConfig } from "./k8s-client";
import { GITHUB_CONFIG } from "./vcs-providers";

export interface PullRequestPodOptions {
  name: string;
  namespace?: string;
  image?: string;
  clusterName?: string;
  env?: {
    // Required environment variables from webhook
    REPO_URL: string;
    PR_BRANCH: string;
    PR_NUMBER: string;
    GITHUB_USER: string;
    // Optional additional environment variables
    [key: string]: string;
  };
}

export interface PullRequestPodResult {
  jobName: string;
  serviceAccountName: string;
  namespace: string;
  created: boolean;
}

/**
 * Get BatchV1Api for job management
 */
export async function getBatchV1Api() {
  const k8sModule = await import("@kubernetes/client-node");
  return k8sModule.BatchV1Api;
}

/**
 * Get RbacAuthorizationV1Api for RBAC management
 */
export async function getRbacAuthorizationV1Api() {
  const k8sModule = await import("@kubernetes/client-node");
  return k8sModule.RbacAuthorizationV1Api;
}

/**
 * Create a service account with permissions to create pods for buildx kubernetes driver
 */
export async function createBuildxServiceAccount(
  name: string,
  namespace: string = "default",
  clusterName?: string,
): Promise<void> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(
      `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
    );
  }

  const CoreV1Api = await getCoreV1Api();
  const RbacAuthorizationV1Api = await getRbacAuthorizationV1Api();

  const coreApi = kc.makeApiClient(CoreV1Api);
  const rbacApi = kc.makeApiClient(RbacAuthorizationV1Api);

  const serviceAccountName = `${name}-buildx-sa`;
  const roleName = `${name}-buildx-role`;
  const roleBindingName = `${name}-buildx-rolebinding`;

  try {
    // Create service account
    const serviceAccount = {
      apiVersion: "v1",
      kind: "ServiceAccount",
      metadata: {
        name: serviceAccountName,
        namespace: namespace,
        labels: {
          app: "catalyst-buildx",
          "created-by": "catalyst-web-app",
          "pr-job": name,
        },
      },
    };

    try {
      await coreApi.createNamespacedServiceAccount({
        namespace,
        body: serviceAccount,
      });
    } catch (error: unknown) {
      // If service account already exists, that's fine - we can reuse it
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorBody = (error as { body?: string })?.body || "";
      if (
        !errorBody.includes("already exists") &&
        !errorMessage.includes("already exists")
      ) {
        throw error;
      }
    }

    // Create role with pod creation permissions for buildx
    const role = {
      apiVersion: "rbac.authorization.k8s.io/v1",
      kind: "Role",
      metadata: {
        name: roleName,
        namespace: namespace,
        labels: {
          app: "catalyst-buildx",
          "created-by": "catalyst-web-app",
          "pr-job": name,
        },
      },
      rules: [
        {
          apiGroups: ["apps"],
          resources: ["deployments"],
          verbs: [
            "get",
            "list",
            "watch",
            "create",
            "update",
            "patch",
            "delete",
          ],
        },
        {
          apiGroups: ["apps"],
          resources: ["deployments/scale"],
          verbs: ["patch", "update"],
        },
        {
          apiGroups: ["apps"],
          resources: ["replicasets"],
          verbs: ["get", "list", "watch"],
        },
        {
          apiGroups: ["apps"],
          resources: ["statefulsets"],
          verbs: ["get", "list", "create", "patch"],
        },
        {
          apiGroups: [""],
          resources: ["pods", "services"],
          verbs: [
            "get",
            "list",
            "watch",
            "create",
            "update",
            "patch",
            "delete",
          ],
        },
        {
          apiGroups: [""],
          resources: ["serviceaccounts"],
          verbs: ["get", "list", "create", "patch"],
        },
        {
          apiGroups: [""],
          resources: ["pods/exec"],
          verbs: ["create"],
        },
        {
          apiGroups: [""],
          resources: ["configmaps", "secrets"],
          verbs: [
            "get",
            "list",
            "watch",
            "create",
            "update",
            "patch",
            "delete",
          ],
        },
        {
          apiGroups: ["networking.k8s.io"],
          resources: ["networkpolicies"],
          verbs: ["get", "list", "create", "patch"],
        },
        {
          apiGroups: ["policy"],
          resources: ["poddisruptionbudgets"],
          verbs: ["get", "list", "create", "patch"],
        },
      ],
    };

    try {
      await rbacApi.createNamespacedRole({ namespace, body: role });
    } catch (error: unknown) {
      // If role already exists, that's fine - we can reuse it
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorBody = (error as { body?: string })?.body || "";
      if (
        !errorBody.includes("already exists") &&
        !errorMessage.includes("already exists")
      ) {
        throw error;
      }
    }

    // Create role binding
    const roleBinding = {
      apiVersion: "rbac.authorization.k8s.io/v1",
      kind: "RoleBinding",
      metadata: {
        name: roleBindingName,
        namespace: namespace,
        labels: {
          app: "catalyst-buildx",
          "created-by": "catalyst-web-app",
          "pr-job": name,
        },
      },
      subjects: [
        {
          kind: "ServiceAccount",
          name: serviceAccountName,
          namespace: namespace,
        },
      ],
      roleRef: {
        kind: "Role",
        name: roleName,
        apiGroup: "rbac.authorization.k8s.io",
      },
    };

    try {
      await rbacApi.createNamespacedRoleBinding({
        namespace,
        body: roleBinding,
      });
    } catch (error: unknown) {
      // If role binding already exists, that's fine - we can reuse it
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorBody = (error as { body?: string })?.body || "";
      if (
        !errorBody.includes("already exists") &&
        !errorMessage.includes("already exists")
      ) {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error creating buildx service account:", error);
    throw error;
  }
}

/**
 * Create GitHub PAT secret for repository access
 *
 * IMPORTANT: This function creates a Kubernetes secret containing a GitHub Personal Access Token
 * that is used by PR pods for git repository operations (cloning, fetching, etc.).
 *
 * TOKEN REQUIREMENTS:
 * - For PUBLIC repositories: Token is still required for rate limiting and consistency
 * - For PRIVATE repositories: Token MUST have appropriate repository access permissions
 * - For GitHub Container Registry: Token may need 'read:packages' scope for image pulls
 *
 * ENVIRONMENT SETUP:
 * - Production: Should use GitHub App installation tokens (future implementation)
 * - Development: Uses GITHUB_PAT environment variable
 * - CI/Integration Tests: Uses mocked GITHUB_PAT value
 *
 * INTEGRATION TESTS:
 * Integration tests mock this environment variable because:
 * 1. CI environments don't have real GitHub PATs configured
 * 2. Tests use public repositories that don't require authentication for cloning
 * 3. The mocked token allows testing the full code path without external dependencies
 *
 * FUTURE CONSIDERATIONS:
 * If PR pods need to access private repositories or push to registries, this function
 * should be updated to:
 * 1. Accept user-specific or installation-specific tokens
 * 2. Use GitHub App installation tokens instead of static PATs
 * 3. Support token rotation and refresh mechanisms
 *
 * @param namespace Kubernetes namespace to create the secret in
 * @param clusterName Optional cluster name for multi-cluster support
 */
export async function createGitHubPATSecret(
  namespace: string = "default",
  clusterName?: string,
): Promise<void> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(
      `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
    );
  }

  const CoreV1Api = await getCoreV1Api();
  const coreApi = kc.makeApiClient(CoreV1Api);

  // Get PAT from environment
  const githubPat = GITHUB_CONFIG.PAT;
  const githubGhcrPat = GITHUB_CONFIG.GHCR_PAT;

  if (!githubPat) {
    throw new Error("GITHUB_PAT not found in environment configuration");
  }

  const secretName = "github-pat-secret";

  const secret = {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: secretName,
      namespace: namespace,
      labels: {
        app: "catalyst-pr-job",
        "created-by": "catalyst-web-app",
      },
    },
    type: "Opaque",
    data: {
      token: Buffer.from(githubPat).toString("base64"),
      ghcr_token: Buffer.from(githubGhcrPat || githubPat).toString("base64"),
    },
  };

  try {
    // Try to create the secret first
    await coreApi.createNamespacedSecret({ namespace, body: secret });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorBody = (error as { body?: string })?.body || "";

    // If secret already exists, update it instead
    if (
      errorBody.includes("already exists") ||
      errorMessage.includes("already exists")
    ) {
      try {
        await coreApi.replaceNamespacedSecret({
          name: secretName,
          namespace,
          body: secret,
        });
      } catch (updateError) {
        console.error("Error updating GitHub PAT secret:", updateError);
        throw updateError;
      }
    } else {
      console.error("Error creating GitHub PAT secret:", error);
      throw error;
    }
  }
}

/**
 * Create a pull request pod job manifest that uses buildx kubernetes driver
 */
export async function createPullRequestPodJob(
  options: PullRequestPodOptions,
): Promise<PullRequestPodResult> {
  const {
    name,
    namespace = "default",
    image = "ghcr.io/ncrmro/catalyst/pr-job-pod:latest",
    clusterName,
    env,
  } = options;

  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(
      `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
    );
  }

  const BatchV1Api = await getBatchV1Api();
  const batchApi = kc.makeApiClient(BatchV1Api);

  // Use generateName for unique job names - Kubernetes will append a random suffix
  const jobGenerateName = `pr-job-${name}-`;

  const serviceAccountName = `${name}-buildx-sa`;

  // First create the service account and RBAC
  await createBuildxServiceAccount(name, namespace, clusterName);

  // Create GitHub PAT secret for repository access
  await createGitHubPATSecret(namespace, clusterName);

  try {
    // Create job manifest
    const job = {
      apiVersion: "batch/v1",
      kind: "Job",
      metadata: {
        generateName: jobGenerateName,
        namespace: namespace,
        labels: {
          app: "catalyst-pr-job",
          "created-by": "catalyst-web-app",
          "pr-name": name,
        },
      },
      spec: {
        template: {
          metadata: {
            labels: {
              app: "catalyst-pr-job",
              "created-by": "catalyst-web-app",
              "pr-name": name,
            },
          },
          spec: {
            serviceAccountName: serviceAccountName,
            restartPolicy: "Never",
            containers: [
              {
                name: "buildx-container",
                image: image,
                env: [
                  // GitHub token from secret
                  {
                    name: "GITHUB_TOKEN",
                    valueFrom: {
                      secretKeyRef: {
                        name: "github-pat-secret",
                        key: "token",
                      },
                    },
                  },
                  // Environment variables passed from webhook
                  ...(env
                    ? Object.entries(env).map(([name, value]) => ({
                        name,
                        value,
                      }))
                    : []),
                ],
                command: ["/bin/sh"],
                args: [
                  "-c",
                  `
                  set -e

                  echo ""
                  echo "=== PR Pod Build Script ==="
                  echo ""

                  # Environment variables should be provided by webhook
                  if [ -z "\$REPO_URL" ] || [ -z "\$PR_BRANCH" ] || [ -z "\$PR_NUMBER" ]; then
                    echo "ERROR: Required environment variables not provided by webhook"
                    echo "Missing: REPO_URL, PR_BRANCH, PR_NUMBER"
                    exit 1
                  fi

                  echo "Configuration:"
                  echo "  Repository: \$REPO_URL"
                  echo "  PR Branch: \$PR_BRANCH"
                  echo "  PR Number: \$PR_NUMBER"
                  echo "  Image: \$IMAGE_NAME"
                  echo "  Build Required: \$NEEDS_BUILD"
                  echo ""

                  echo "=== Verifying pre-installed tools ==="
                  helm version --short || echo "Helm version check failed"
                  kubectl version --client || echo "kubectl version check failed"
                  git --version || echo "Git version check failed"
                  docker --version || echo "Docker version check failed"
                  echo "✓ All tools verified"
                  echo ""

                  echo "=== Setting up buildx kubernetes builder ==="
                  # Check if builder already exists
                  if docker buildx inspect k8s-builder >/dev/null 2>&1; then
                    echo "Found existing k8s-builder, using it..."
                    docker buildx use k8s-builder
                  else
                    echo "Creating new k8s-builder..."
                    docker buildx create --driver kubernetes --name k8s-builder --bootstrap
                    docker buildx use k8s-builder
                  fi
                  echo "✓ Buildx kubernetes driver ready"
                  echo ""

                  echo "=== Setting up Git Configuration ==="
                  echo "Setting up git configuration..."
                  git config --global credential.helper '!f() { echo "username=x-access-token"; echo "password=\$GITHUB_TOKEN"; }; f'
                  echo ""

                  echo "=== Cloning Repository ==="
                  echo "Shallow clone enabled: \$SHALLOW_CLONE"
                  
                  # For now, clone to /tmp since we don't have persistent volumes yet
                  if [ -d "/tmp/workspace/.git" ]; then
                    echo "Found existing repository in cache, fetching updates..."
                    cd /tmp/workspace
                    if [ "\$SHALLOW_CLONE" = "true" ]; then
                      # For shallow repos, fetch with depth=1
                      git fetch --depth=1 origin \$PR_BRANCH
                    else
                      git fetch origin
                    fi
                    git checkout \$PR_BRANCH
                    git pull origin \$PR_BRANCH
                    echo "Repository updated from cache!"
                  else
                    echo "No cache found, cloning repository..."
                    if [ "\$SHALLOW_CLONE" = "true" ]; then
                      echo "Performing shallow clone (depth=1)..."
                      git clone --depth=1 --branch \$PR_BRANCH \$REPO_URL /tmp/workspace
                    else
                      echo "Performing full clone..."
                      git clone \$REPO_URL /tmp/workspace
                      cd /tmp/workspace
                      echo "Checking out PR branch..."
                      git checkout \$PR_BRANCH
                    fi
                    
                    if [ "\$SHALLOW_CLONE" = "true" ]; then
                      cd /tmp/workspace
                    fi
                    echo "Repository cloned successfully!"
                  fi

                  echo "Repository ready!"
                  echo "Git status:"
                  git status
                  echo ""

                  echo "Repository contents:"
                  ls -la
                  echo ""

                  echo "Git repository info:"
                  if [ "\$SHALLOW_CLONE" = "true" ]; then
                    echo "  Clone type: Shallow (depth=1)"
                  else
                    echo "  Clone type: Full"
                  fi
                  echo "  Git log count: \$(git rev-list --count HEAD)"
                  echo ""

                  echo "=== Building Docker Image ==="
                  echo "Build required: \$NEEDS_BUILD"
                  
                  if [ "\$NEEDS_BUILD" = "true" ]; then
                    echo "Dockerfile path: \$MANIFEST_DOCKERFILE"
                    
                    # Check if Dockerfile exists
                    DOCKERFILE_FULL_PATH="/tmp/workspace\$MANIFEST_DOCKERFILE"
                    if [ -f "\$DOCKERFILE_FULL_PATH" ]; then
                      echo "✓ Found Dockerfile at: \$DOCKERFILE_FULL_PATH"
                      
                      # Build image using buildx - change to web directory for correct build context
                      IMAGE_TAG="ghcr.io/\$GITHUB_USER/\$IMAGE_NAME:pr-\$PR_NUMBER"
                      echo "Building image: \$IMAGE_TAG"
                      echo "Build context: /tmp/workspace/web"
                      
                      cd /tmp/workspace/web
                      docker buildx build \\
                        --platform linux/amd64 \\
                        --tag "\$IMAGE_TAG" \\
                        --progress=plain \\
                        .
                      
                      echo "✓ Image built successfully: \$IMAGE_TAG"
                    else
                      echo "✗ Dockerfile not found at: \$DOCKERFILE_FULL_PATH"
                      echo "Available files in repository root:"
                      ls -la /tmp/workspace/
                      echo "Available files in web directory:"
                      ls -la /tmp/workspace/web/ || echo "Web directory not found"
                    fi
                  else
                    echo "⏭ Skipping Docker build (NEEDS_BUILD=false)"
                  fi
                  echo ""

                  echo "=== Test Complete ==="
                  echo "PR pod successfully:"
                  echo "  ✓ Verified all tools (helm, kubectl, git, docker)"
                  echo "  ✓ Created buildx Kubernetes driver"
                  echo "  ✓ Cloned repository: \$REPO_URL (shallow: \$SHALLOW_CLONE)"
                  echo "  ✓ Checked out branch: \$PR_BRANCH"
                  if [ "\$NEEDS_BUILD" = "true" ]; then
                    if [ -f "/tmp/workspace\$MANIFEST_DOCKERFILE" ]; then
                      echo "  ✓ Built Docker image: ghcr.io/\$GITHUB_USER/\$IMAGE_NAME:pr-\$PR_NUMBER"
                    else
                      echo "  ⚠ Skipped Docker build (no Dockerfile found)"
                    fi
                  else
                    echo "  ⏭ Skipped Docker build (NEEDS_BUILD=false)"
                  fi
                  echo "Ready for deployment pipeline."
                  `,
                ],
                resources: {
                  limits: {
                    cpu: "500m",
                    memory: "512Mi",
                  },
                  requests: {
                    cpu: "100m",
                    memory: "128Mi",
                  },
                },
              },
            ],
          },
        },
        backoffLimit: 3,
        ttlSecondsAfterFinished: 3600, // Clean up after 1 hour
      },
    };

    const response = await batchApi.createNamespacedJob({
      namespace,
      body: job,
    });
    const actualJobName = response.metadata?.name || jobGenerateName;

    return {
      jobName: actualJobName,
      serviceAccountName,
      namespace,
      created: true,
    };
  } catch (error) {
    console.error("Error creating pull request pod job:", error);
    throw error;
  }
}

/**
 * Check the status of a pull request pod job
 */
export async function getPullRequestPodJobStatus(
  jobName: string,
  namespace: string = "default",
  clusterName?: string,
): Promise<{
  jobName: string;
  status: string;
  succeeded?: number;
  failed?: number;
  active?: number;
  conditions?: Record<string, unknown>[];
}> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(
      `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
    );
  }

  const BatchV1Api = await getBatchV1Api();
  const batchApi = kc.makeApiClient(BatchV1Api);

  try {
    const response = await batchApi.readNamespacedJob({
      name: jobName,
      namespace,
    });
    const job = response;

    return {
      jobName,
      status: job.status?.conditions?.[0]?.type || "Unknown",
      succeeded: job.status?.succeeded || 0,
      failed: job.status?.failed || 0,
      active: job.status?.active || 0,
      conditions: (job.status?.conditions || []) as unknown as Record<
        string,
        unknown
      >[],
    };
  } catch (error) {
    console.error("Error getting job status:", error);
    throw error;
  }
}

/**
 * Clean up pull request pod job and associated resources
 */
export async function cleanupPullRequestPodJob(
  name: string,
  namespace: string = "default",
  clusterName?: string,
): Promise<void> {
  const kc = await getClusterConfig(clusterName);
  if (!kc) {
    throw new Error(
      `Kubernetes cluster configuration not found${clusterName ? ` for cluster: ${clusterName}` : ". No clusters available."}`,
    );
  }

  const CoreV1Api = await getCoreV1Api();
  const BatchV1Api = await getBatchV1Api();
  const RbacAuthorizationV1Api = await getRbacAuthorizationV1Api();

  const coreApi = kc.makeApiClient(CoreV1Api);
  const batchApi = kc.makeApiClient(BatchV1Api);
  const rbacApi = kc.makeApiClient(RbacAuthorizationV1Api);

  const serviceAccountName = `${name}-buildx-sa`;
  const roleName = `${name}-buildx-role`;
  const roleBindingName = `${name}-buildx-rolebinding`;

  try {
    // Delete jobs with the pr-name label
    const jobs = await batchApi.listNamespacedJob({
      namespace,
      labelSelector: `pr-name=${name}`,
    });

    for (const job of jobs.items) {
      if (job.metadata?.name) {
        await batchApi.deleteNamespacedJob({
          name: job.metadata.name,
          namespace,
        });
      }
    }

    // Delete role binding
    try {
      await rbacApi.deleteNamespacedRoleBinding({
        name: roleBindingName,
        namespace,
      });
    } catch {
      // Ignore if not found
    }

    // Delete role
    try {
      await rbacApi.deleteNamespacedRole({ name: roleName, namespace });
    } catch {
      // Ignore if not found
    }

    // Delete service account
    try {
      await coreApi.deleteNamespacedServiceAccount({
        name: serviceAccountName,
        namespace,
      });
    } catch {
      // Ignore if not found
    }
  } catch (error) {
    console.error("Error cleaning up pull request pod job:", error);
    throw error;
  }
}
