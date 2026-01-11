/**
 * Integration test for Pull Request pod build environment validation
 *
 * This test verifies the build environment setup without running full Docker builds:
 * 1. Service account creation with buildx permissions
 * 2. Git repository cloning (shallow)
 * 3. Docker buildx Kubernetes driver setup
 * 4. Dockerfile validation (exists at expected path)
 *
 * Note: This test uses NEEDS_BUILD=false to skip actual Docker builds,
 * reducing disk usage and CI time significantly.
 */

import {
  createPullRequestPodJob,
  getPullRequestPodJobStatus,
  cleanupPullRequestPodJob,
  createBuildxServiceAccount,
} from "../../src/lib/k8s-pull-request-pod";
import { getClusterConfig, getCoreV1Api } from "../../src/lib/k8s-client";
import type { V1PolicyRule } from "@kubernetes/client-node";

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
  const testName = `pr-job-test-docker-build-${Date.now()}`;
  let createdJobName: string;

  beforeAll(async () => {
    // Verify KUBECONFIG_PRIMARY is set
    expect(process.env.KUBECONFIG_PRIMARY).toBeDefined();

    // Clean up any existing resources from previous test runs
    try {
      await cleanupPullRequestPodJob(testName, testNamespace, "PRIMARY");
    } catch {
      // Expected if no existing resources
    }
  });

  afterAll(async () => {
    // Clean up any created resources
    try {
      await cleanupPullRequestPodJob(testName, testNamespace, "PRIMARY");
    } catch {
      // Expected if tests failed or cleanup already done
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

  describe("Build Environment Validation", () => {
    it("should clone repository and validate build environment without full Docker build", async () => {
      // Create the job with NEEDS_BUILD=false to skip actual Docker build
      // This validates the build environment setup without consuming disk space
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
          NEEDS_BUILD: "false", // Skip Docker build to save disk space
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

      // Wait for pod to complete (should be fast since no Docker build)
      const CoreV1Api = await getCoreV1Api();
      const coreApi = kc!.makeApiClient(CoreV1Api);

      // Wait for pod to be created
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const pods = await coreApi.listNamespacedPod({
        namespace: testNamespace,
        labelSelector: `job-name=${createdJobName}`,
      });

      expect(pods.items.length).toBeGreaterThan(0);
      const pod = pods.items[0];
      const podName = pod.metadata?.name;
      if (!podName) throw new Error("Pod name is undefined");

      // Wait for pod to reach a terminal state (faster without Docker build)
      let podStatus = pod.status?.phase;
      let attempts = 0;
      const maxAttempts = 24; // 2 minutes with 5-second intervals

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
      }

      // Get pod logs for verification
      const logs = await coreApi.readNamespacedPodLog({
        name: podName,
        namespace: testNamespace,
      });

      // Verify build environment setup stages completed
      expect(logs).toContain("=== PR Pod Build Script ===");
      expect(logs).toContain("=== Verifying pre-installed tools ===");
      expect(logs).toContain("✓ All tools verified");
      expect(logs).toContain("=== Setting up buildx kubernetes builder ===");
      expect(logs).toContain("✓ Buildx kubernetes driver ready");
      expect(logs).toContain("=== Cloning Repository ===");
      expect(logs).toContain("Repository cloned successfully!");
      expect(logs).toContain("Build required: false");
      expect(logs).toContain("⏭ Skipping Docker build (NEEDS_BUILD=false)");
      expect(logs).toContain("=== Test Complete ===");

      // Verify job status
      let status = await getPullRequestPodJobStatus(
        createdJobName,
        testNamespace,
        "PRIMARY",
      );
      expect(status).toBeDefined();
      expect(status.jobName).toBe(createdJobName);

      // Pod should succeed since we're skipping the build
      if (podStatus === "Succeeded") {
        // Wait for Job controller to update status
        let attempts = 0;
        while ((status.succeeded || 0) === 0 && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          status = await getPullRequestPodJobStatus(
            createdJobName,
            testNamespace,
            "PRIMARY",
          );
          attempts++;
        }
        expect(status.succeeded).toBeGreaterThan(0);
      }
    }, 180000); // 3 minute timeout
  });

  describe("Resource Cleanup", () => {
    it("should clean up all created resources", async () => {
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
