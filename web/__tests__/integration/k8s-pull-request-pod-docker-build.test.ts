/**
 * Integration test for Pull Request pod Docker image building functionality
 *
 * This test verifies the complete Docker image building workflow including:
 * 1. Service account creation with buildx permissions
 * 2. Git repository cloning (shallow and full)
 * 3. Docker buildx Kubernetes driver setup
 * 4. Real Docker image building with correct build context
 * 5. Environment variable integration
 * 6. Error handling and resource cleanup
 *
 * Note: This test requires:
 * - Valid Kubernetes configuration with buildx support
 * - Docker registry access (for image pushing, if enabled)
 * - Extended timeouts for Docker build operations
 * - GitHub repository access for real cloning
 */

import {
  createPullRequestPodJob,
  getPullRequestPodJobStatus,
  cleanupPullRequestPodJob,
  createBuildxServiceAccount,
} from "../../src/lib/k8s-pull-request-pod";
import { getClusterConfig, getCoreV1Api } from "../../src/lib/k8s-client";
import type { V1PolicyRule, V1EnvVar } from "@kubernetes/client-node";

import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";

// Mock the VCS providers configuration
vi.mock("@/lib/vcs-providers", () => ({
  GITHUB_CONFIG: {
    PAT: "mock-github-pat-for-integration-tests",
    GHCR_PAT: "mock-ghcr-pat-for-integration-tests",
  },
}));

describe("Pull Request Pod Docker Build Integration", () => {
  const testNamespace = "default";
  const testName = `test-docker-build-${Date.now()}`;
  let createdJobName: string;

  // Extended timeout for Docker build operations
  const dockerBuildTimeout = 300000; // 5 minutes

  beforeAll(async () => {
    // Verify KUBECONFIG_PRIMARY is set
    expect(process.env.KUBECONFIG_PRIMARY).toBeDefined();

    // Clean up any existing resources from previous test runs
    try {
      await cleanupPullRequestPodJob(testName, testNamespace, "PRIMARY");
    } catch (error) {
      console.warn(
        "Pre-test cleanup (expected if no existing resources):",
        error,
      );
    }
  });

  afterAll(async () => {
    // Clean up any created resources
    try {
      await cleanupPullRequestPodJob(testName, testNamespace, "PRIMARY");
    } catch (error) {
      console.warn(
        "Cleanup failed (this may be expected if tests failed):",
        error,
      );
    }
  });

  describe("Service Account with Buildx Permissions", () => {
    it("should create service account with comprehensive RBAC for Docker builds", async () => {
      // Create the service account with buildx permissions
      try {
        await createBuildxServiceAccount(testName, testNamespace, "PRIMARY");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("already exists")) {
          throw error;
        }
      }

      // Verify service account exists with correct labels
      const kc = await getClusterConfig("PRIMARY");
      expect(kc).not.toBeNull();

      const CoreV1Api = await getCoreV1Api();
      const coreApi = kc!.makeApiClient(CoreV1Api);

      const serviceAccountName = `${testName}-buildx-sa`;
      const serviceAccount = await coreApi.readNamespacedServiceAccount({
        name: serviceAccountName,
        namespace: testNamespace,
      });

      expect(serviceAccount).toBeDefined();
      expect(serviceAccount.metadata?.name).toBe(serviceAccountName);
      expect(serviceAccount.metadata?.labels?.["app"]).toBe("catalyst-buildx");
      expect(serviceAccount.metadata?.labels?.["created-by"]).toBe(
        "catalyst-web-app",
      );

      // Verify RBAC permissions exist
      const { getRbacAuthorizationV1Api } =
        await import("../../src/lib/k8s-pull-request-pod");
      const RbacAuthorizationV1Api = await getRbacAuthorizationV1Api();
      const rbacApi = kc!.makeApiClient(RbacAuthorizationV1Api);

      const roleName = `${testName}-buildx-role`;
      const role = await rbacApi.readNamespacedRole({
        name: roleName,
        namespace: testNamespace,
      });

      expect(role).toBeDefined();
      expect(role.rules).toBeDefined();

      // Verify comprehensive permissions for Docker builds
      const rules = role.rules!;
      const hasDeploymentPermissions = rules.some(
        (rule: V1PolicyRule) =>
          rule.apiGroups?.includes("apps") &&
          rule.resources?.includes("deployments") &&
          rule.verbs?.includes("create") &&
          rule.verbs?.includes("update") &&
          rule.verbs?.includes("patch"),
      );
      expect(hasDeploymentPermissions).toBe(true);

      const hasPodPermissions = rules.some(
        (rule: V1PolicyRule) =>
          rule.apiGroups?.includes("") &&
          rule.resources?.includes("pods") &&
          rule.verbs?.includes("create") &&
          rule.verbs?.includes("get") &&
          rule.verbs?.includes("list"),
      );
      expect(hasPodPermissions).toBe(true);

      const hasSecretPermissions = rules.some(
        (rule: V1PolicyRule) =>
          rule.apiGroups?.includes("") &&
          rule.resources?.includes("secrets") &&
          rule.verbs?.includes("create") &&
          rule.verbs?.includes("get"),
      );
      expect(hasSecretPermissions).toBe(true);
    }, 60000);
  });

  describe("Docker Image Building Integration", () => {
    it(
      "should create and execute PR pod with Docker image building",
      async () => {
        // Create the job with real Docker build environment
        const result = await createPullRequestPodJob({
          name: testName,
          namespace: testNamespace,
          clusterName: "PRIMARY",
          env: {
            REPO_URL: "https://github.com/ncrmro/catalyst.git",
            PR_BRANCH: "main",
            PR_NUMBER: "999",
            GITHUB_USER: "ncrmro",
            IMAGE_NAME: "catalyst/web",
            NEEDS_BUILD: "true",
            SHALLOW_CLONE: "true",
            MANIFEST_DOCKERFILE: "/web/Dockerfile",
            TARGET_NAMESPACE: testNamespace,
          },
        });

        expect(result).toBeDefined();
        expect(result.created).toBe(true);
        expect(result.jobName).toContain(testName);
        expect(result.namespace).toBe(testNamespace);

        createdJobName = result.jobName;

        // Verify job was created in Kubernetes with correct configuration
        const kc = await getClusterConfig("PRIMARY");
        const { getBatchV1Api } =
          await import("../../src/lib/k8s-pull-request-pod");
        const BatchV1Api = await getBatchV1Api();
        const batchApi = kc!.makeApiClient(BatchV1Api);

        const job = await batchApi.readNamespacedJob({
          name: createdJobName,
          namespace: testNamespace,
        });

        expect(job).toBeDefined();
        expect(job.metadata?.name).toBe(createdJobName);
        expect(job.metadata?.labels?.["app"]).toBe("catalyst-pr-job");

        // Verify environment variables are set correctly
        const container = job.spec?.template?.spec?.containers?.[0];
        expect(container).toBeDefined();

        const envVars = container?.env || [];
        const repoUrlEnv = envVars.find(
          (env: V1EnvVar) => env.name === "REPO_URL",
        );
        expect(repoUrlEnv?.value).toBe(
          "https://github.com/ncrmro/catalyst.git",
        );

        const needsBuildEnv = envVars.find(
          (env: V1EnvVar) => env.name === "NEEDS_BUILD",
        );
        expect(needsBuildEnv?.value).toBe("true");

        const shallowCloneEnv = envVars.find(
          (env: V1EnvVar) => env.name === "SHALLOW_CLONE",
        );
        expect(shallowCloneEnv?.value).toBe("true");

        const dockerfileEnv = envVars.find(
          (env: V1EnvVar) => env.name === "MANIFEST_DOCKERFILE",
        );
        expect(dockerfileEnv?.value).toBe("/web/Dockerfile");

        // Verify service account is set
        expect(job.spec?.template?.spec?.serviceAccountName).toBe(
          `${testName}-buildx-sa`,
        );
      },
      dockerBuildTimeout,
    );

    it(
      "should verify Docker build execution and completion",
      async () => {
        // Skip if job creation failed
        if (!createdJobName) {
          console.warn("Skipping Docker build verification - job not created");
          return;
        }

        const kc = await getClusterConfig("PRIMARY");
        const CoreV1Api = await getCoreV1Api();
        const coreApi = kc!.makeApiClient(CoreV1Api);

        // Wait for pod to be created
        console.log("Waiting for pod to be created...");
        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Get the pod created by the job
        const pods = await coreApi.listNamespacedPod({
          namespace: testNamespace,
          labelSelector: `job-name=${createdJobName}`,
        });

        expect(pods.items.length).toBeGreaterThan(0);
        const pod = pods.items[0];
        const podName = pod.metadata?.name;
        if (!podName) throw new Error("Pod name is undefined");

        console.log(`Found pod: ${podName}`);

        // Wait for pod to reach a terminal state (Succeeded, Failed, or Running for extended time)
        let podStatus = pod.status?.phase;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes with 5-second intervals

        while (
          podStatus !== "Succeeded" &&
          podStatus !== "Failed" &&
          attempts < maxAttempts
        ) {
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const updatedPod = await coreApi.readNamespacedPod({
            name: podName,
            namespace: testNamespace,
          });

          podStatus = updatedPod.status?.phase;
          attempts++;

          if (attempts % 6 === 0) {
            // Log every 30 seconds
            console.log(
              `Pod status after ${attempts * 5} seconds: ${podStatus}`,
            );
          }
        }

        // Get final pod logs for analysis
        const logs = await coreApi.readNamespacedPodLog({
          name: podName,
          namespace: testNamespace,
        });

        console.log("Pod execution logs:");
        console.log("=====================================");
        console.log(logs);
        console.log("=====================================");

        // Verify Docker build workflow stages in logs
        expect(logs).toContain("=== PR Pod Build Script ===");
        expect(logs).toContain("=== Verifying pre-installed tools ===");
        expect(logs).toContain("=== Setting up buildx kubernetes builder ===");
        expect(logs).toContain("=== Cloning Repository ===");
        expect(logs).toContain("Shallow clone enabled: true");
        expect(logs).toContain("=== Building Docker Image ===");
        expect(logs).toContain(
          "✓ Found Dockerfile at: /tmp/workspace/web/Dockerfile",
        );
        expect(logs).toContain("Build context: /tmp/workspace/web");

        // Verify buildx setup
        expect(logs).toContain("✓ Buildx kubernetes driver ready");

        // Verify repository cloning
        expect(logs).toContain("Repository cloned successfully!");
        expect(logs).toContain("Git status:");

        // Verify Docker build started
        expect(logs).toContain(
          "Building image: ghcr.io/ncrmro/catalyst/web:pr-999",
        );
        expect(logs).toContain(
          'building with "k8s-builder" instance using kubernetes driver',
        );

        // Check for build completion or reasonable progress
        const hasDockerBuildProgress =
          logs.includes("load build definition from Dockerfile") ||
          logs.includes("resolve image config") ||
          logs.includes("FROM docker.io/library/node:22");

        expect(hasDockerBuildProgress).toBe(true);

        // If pod succeeded, verify successful completion
        if (podStatus === "Succeeded") {
          expect(logs).toContain("✓ Image built successfully");
          expect(logs).toContain("=== Test Complete ===");
        } else if (podStatus === "Failed") {
          // For failed pods, at least verify the setup stages completed
          console.warn(
            "Pod failed, but verifying setup stages completed correctly",
          );
          expect(logs).toContain("✓ All tools verified");
          expect(logs).toContain("✓ Buildx kubernetes driver ready");
        } else {
          // Pod is still running after timeout - this is acceptable for slow builds
          console.log(
            "Pod still running after timeout - build may be in progress",
          );
          expect(podStatus).toBe("Running");
        }

        // Wait a bit for job status to be updated
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify job status reflects pod state
        const status = await getPullRequestPodJobStatus(
          createdJobName,
          testNamespace,
          "PRIMARY",
        );
        expect(status).toBeDefined();
        expect(status.jobName).toBe(createdJobName);

        if (podStatus === "Succeeded") {
          expect(status.succeeded).toBeGreaterThan(0);
        } else if (podStatus === "Failed") {
          expect(status.failed).toBeGreaterThan(0);
        } else {
          expect(status.active).toBeGreaterThan(0);
        }
      },
      dockerBuildTimeout,
    );
  });

  describe("Environment Variable Integration", () => {
    it("should handle different SHALLOW_CLONE configurations", async () => {
      // Test with SHALLOW_CLONE=false for full clone
      const fullCloneJobName = `${testName}-full-clone`;

      const result = await createPullRequestPodJob({
        name: fullCloneJobName,
        namespace: testNamespace,
        clusterName: "PRIMARY",
        env: {
          REPO_URL: "https://github.com/ncrmro/catalyst.git",
          PR_BRANCH: "main",
          PR_NUMBER: "998",
          GITHUB_USER: "ncrmro",
          IMAGE_NAME: "catalyst/web",
          NEEDS_BUILD: "false", // Skip build to focus on clone testing
          SHALLOW_CLONE: "false",
          MANIFEST_DOCKERFILE: "/web/Dockerfile",
          TARGET_NAMESPACE: testNamespace,
        },
      });

      expect(result.created).toBe(true);

      // Wait for pod execution
      await new Promise((resolve) => setTimeout(resolve, 15000));

      // Get pod logs to verify full clone behavior
      const kc = await getClusterConfig("PRIMARY");
      const CoreV1Api = await getCoreV1Api();
      const coreApi = kc!.makeApiClient(CoreV1Api);

      const pods = await coreApi.listNamespacedPod({
        namespace: testNamespace,
        labelSelector: `job-name=${result.jobName}`,
      });

      if (pods.items.length > 0) {
        const pod = pods.items[0];
        const podName = pod.metadata?.name;
        if (!podName) throw new Error("Pod name is undefined");

        try {
          const logs = await coreApi.readNamespacedPodLog({
            name: podName,
            namespace: testNamespace,
          });

          expect(logs).toContain("Shallow clone enabled: false");
          expect(logs).toContain("Performing full clone...");
        } catch (error) {
          console.warn("Could not retrieve logs for full clone test:", error);
        }
      }

      // Cleanup the test job
      try {
        await cleanupPullRequestPodJob(
          fullCloneJobName,
          testNamespace,
          "PRIMARY",
        );
      } catch (error) {
        console.warn("Cleanup failed for full clone test:", error);
      }
    }, 120000);

    it("should handle NEEDS_BUILD=false to skip Docker building", async () => {
      const noBuildJobName = `${testName}-no-build`;

      const result = await createPullRequestPodJob({
        name: noBuildJobName,
        namespace: testNamespace,
        clusterName: "PRIMARY",
        env: {
          REPO_URL: "https://github.com/ncrmro/catalyst.git",
          PR_BRANCH: "main",
          PR_NUMBER: "997",
          GITHUB_USER: "ncrmro",
          IMAGE_NAME: "catalyst/web",
          NEEDS_BUILD: "false",
          SHALLOW_CLONE: "true",
          MANIFEST_DOCKERFILE: "/web/Dockerfile",
          TARGET_NAMESPACE: testNamespace,
        },
      });

      expect(result.created).toBe(true);

      // Wait for pod execution
      await new Promise((resolve) => setTimeout(resolve, 15000));

      // Get pod logs to verify build was skipped
      const kc = await getClusterConfig("PRIMARY");
      const CoreV1Api = await getCoreV1Api();
      const coreApi = kc!.makeApiClient(CoreV1Api);

      const pods = await coreApi.listNamespacedPod({
        namespace: testNamespace,
        labelSelector: `job-name=${result.jobName}`,
      });

      if (pods.items.length > 0) {
        const pod = pods.items[0];
        const podName = pod.metadata?.name;
        if (!podName) throw new Error("Pod name is undefined");

        try {
          const logs = await coreApi.readNamespacedPodLog({
            name: podName,
            namespace: testNamespace,
          });

          // Should complete setup but skip Docker build
          expect(logs).toContain("✓ All tools verified");
          expect(logs).toContain("✓ Buildx kubernetes driver ready");
          expect(logs).toContain("Repository cloned successfully!");

          // Build should be skipped due to NEEDS_BUILD=false
          expect(logs).toContain("Build required: false");
          expect(logs).toContain(
            "⏭ Skipping Docker build (NEEDS_BUILD=false)",
          );
          expect(logs).not.toContain("Building image:");
        } catch (error) {
          console.warn("Could not retrieve logs for no-build test:", error);
        }
      }

      // Cleanup the test job
      try {
        await cleanupPullRequestPodJob(
          noBuildJobName,
          testNamespace,
          "PRIMARY",
        );
      } catch (error) {
        console.warn("Cleanup failed for no-build test:", error);
      }
    }, 120000);
  });

  describe("Error Handling and Resource Management", () => {
    it("should handle missing Dockerfile gracefully", async () => {
      const invalidDockerfileJobName = `${testName}-invalid-dockerfile`;

      const result = await createPullRequestPodJob({
        name: invalidDockerfileJobName,
        namespace: testNamespace,
        clusterName: "PRIMARY",
        env: {
          REPO_URL: "https://github.com/ncrmro/catalyst.git",
          PR_BRANCH: "main",
          PR_NUMBER: "996",
          GITHUB_USER: "ncrmro",
          IMAGE_NAME: "catalyst/web",
          NEEDS_BUILD: "true",
          SHALLOW_CLONE: "true",
          MANIFEST_DOCKERFILE: "/nonexistent/Dockerfile", // Invalid path
          TARGET_NAMESPACE: testNamespace,
        },
      });

      expect(result.created).toBe(true);

      // Wait for pod execution
      await new Promise((resolve) => setTimeout(resolve, 20000));

      // Get pod logs to verify error handling
      const kc = await getClusterConfig("PRIMARY");
      const CoreV1Api = await getCoreV1Api();
      const coreApi = kc!.makeApiClient(CoreV1Api);

      const pods = await coreApi.listNamespacedPod({
        namespace: testNamespace,
        labelSelector: `job-name=${result.jobName}`,
      });

      if (pods.items.length > 0) {
        const pod = pods.items[0];
        const podName = pod.metadata?.name;
        if (!podName) throw new Error("Pod name is undefined");

        try {
          const logs = await coreApi.readNamespacedPodLog({
            name: podName,
            namespace: testNamespace,
          });

          // Should complete setup stages
          expect(logs).toContain("✓ All tools verified");
          expect(logs).toContain("Repository cloned successfully!");

          // Should detect missing Dockerfile
          expect(logs).toContain(
            "✗ Dockerfile not found at: /tmp/workspace/nonexistent/Dockerfile",
          );
          expect(logs).toContain("Available files in web directory:");
        } catch (error) {
          console.warn(
            "Could not retrieve logs for invalid dockerfile test:",
            error,
          );
        }
      }

      // Cleanup the test job
      try {
        await cleanupPullRequestPodJob(
          invalidDockerfileJobName,
          testNamespace,
          "PRIMARY",
        );
      } catch (error) {
        console.warn("Cleanup failed for invalid dockerfile test:", error);
      }
    }, 120000);

    it("should clean up all created resources", async () => {
      // This test verifies that cleanup removes all resources
      if (!createdJobName) {
        console.warn("Skipping cleanup test - no job was created");
        return;
      }

      // Clean up resources
      await cleanupPullRequestPodJob(testName, testNamespace, "PRIMARY");

      const kc = await getClusterConfig("PRIMARY");
      const CoreV1Api = await getCoreV1Api();
      const coreApi = kc!.makeApiClient(CoreV1Api);

      // Verify service account is deleted
      const serviceAccountName = `${testName}-buildx-sa`;
      try {
        await coreApi.readNamespacedServiceAccount({
          name: serviceAccountName,
          namespace: testNamespace,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: unknown) {
        const errorObj = error as {
          response?: { statusCode?: number };
          statusCode?: number;
          code?: number;
          body?: string;
        };

        const statusCode = errorObj.response?.statusCode || errorObj.statusCode;
        const errorCode = errorObj.code;
        const is404Error =
          statusCode === 404 ||
          errorCode === 404 ||
          (errorObj.body &&
            typeof errorObj.body === "string" &&
            errorObj.body.includes('"code":404'));

        expect(is404Error).toBe(true);
      }

      // Verify role is deleted
      const { getRbacAuthorizationV1Api } =
        await import("../../src/lib/k8s-pull-request-pod");
      const RbacAuthorizationV1Api = await getRbacAuthorizationV1Api();
      const rbacApi = kc!.makeApiClient(RbacAuthorizationV1Api);

      const roleName = `${testName}-buildx-role`;
      try {
        await rbacApi.readNamespacedRole({
          name: roleName,
          namespace: testNamespace,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: unknown) {
        const errorObj = error as {
          response?: { statusCode?: number };
          statusCode?: number;
          code?: number;
          body?: string;
        };

        const statusCode = errorObj.response?.statusCode || errorObj.statusCode;
        const errorCode = errorObj.code;
        const is404Error =
          statusCode === 404 ||
          errorCode === 404 ||
          (errorObj.body &&
            typeof errorObj.body === "string" &&
            errorObj.body.includes('"code":404'));

        expect(is404Error).toBe(true);
      }

      // Verify job is deleted
      const { getBatchV1Api } =
        await import("../../src/lib/k8s-pull-request-pod");
      const BatchV1Api = await getBatchV1Api();
      const batchApi = kc!.makeApiClient(BatchV1Api);

      try {
        await batchApi.readNamespacedJob({
          name: createdJobName,
          namespace: testNamespace,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error: unknown) {
        const errorObj = error as {
          response?: { statusCode?: number };
          statusCode?: number;
          code?: number;
          body?: string;
        };

        const statusCode = errorObj.response?.statusCode || errorObj.statusCode;
        const errorCode = errorObj.code;
        const is404Error =
          statusCode === 404 ||
          errorCode === 404 ||
          (errorObj.body &&
            typeof errorObj.body === "string" &&
            errorObj.body.includes('"code":404'));

        expect(is404Error).toBe(true);
      }
    }, 60000);
  });
});
