/**
 * Integration test for Preview Environment Deployment functionality
 *
 * This test verifies that we can:
 * 1. Create a preview deployment (Deployment + Service)
 * 2. Watch deployment status until ready or timeout
 * 3. Get deployment status
 * 4. Clean up preview deployments
 *
 * Note: This test requires a valid Kubernetes configuration available in the
 * KUBECONFIG_PRIMARY environment variable.
 *
 * To run: npm run test:integration -- k8s-preview-deployment
 */

import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  deployPreviewApplication,
  getPreviewDeploymentStatus,
  deletePreviewDeployment,
  watchDeploymentUntilReady,
} from "../../src/lib/k8s-preview-deployment";
import {
  generateNamespace,
  generatePublicUrl,
  generateImageTag,
} from "../../src/models/preview-environments";
import { getClusterConfig } from "../../src/lib/k8s-client";

describe("Preview Deployment Integration", () => {
  const testPrNumber = 9999;
  const _testRepoName = "test-repo";
  const testCommitSha = "abc1234567890";
  const testNamespace = "default"; // Use default namespace for testing
  const testDeploymentName = `preview-test-${Date.now()}`;

  beforeAll(async () => {
    // Verify KUBECONFIG_PRIMARY is set
    expect(process.env.KUBECONFIG_PRIMARY).toBeDefined();

    // Verify we can connect to the cluster
    const kc = await getClusterConfig("PRIMARY");
    expect(kc).not.toBeNull();
  });

  afterAll(async () => {
    // Clean up any test deployments
    try {
      await deletePreviewDeployment(testNamespace, testDeploymentName);
    } catch (error) {
      console.warn("Cleanup (expected if test failed early):", error);
    }
  });

  describe("Helper Functions", () => {
    it("should generate DNS-safe namespace names", () => {
      // Basic case
      expect(generateNamespace("my-app", 42)).toBe("pr-my-app-42");

      // With owner prefix
      expect(generateNamespace("owner/my-app", 42)).toBe("pr-my-app-42");

      // With special characters
      expect(generateNamespace("My_App.Name", 123)).toBe("pr-my-app-name-123");

      // Long repo name gets truncated
      const longName = "a".repeat(100);
      const result = generateNamespace(longName, 1);
      expect(result.length).toBeLessThanOrEqual(63);
      expect(result).toMatch(/^pr-a+-1$/);
    });

    it("should generate public URLs for production mode", () => {
      // Save and clear LOCAL_PREVIEW_ROUTING to test production mode
      const originalValue = process.env.LOCAL_PREVIEW_ROUTING;
      delete process.env.LOCAL_PREVIEW_ROUTING;

      const url = generatePublicUrl("pr-my-app-42", "preview.example.com");
      expect(url).toBe("https://pr-my-app-42.preview.example.com");

      // Restore original value
      process.env.LOCAL_PREVIEW_ROUTING = originalValue;
    });

    it("should generate public URLs for local mode", () => {
      // Save original and set LOCAL_PREVIEW_ROUTING
      const originalValue = process.env.LOCAL_PREVIEW_ROUTING;
      const originalPort = process.env.INGRESS_PORT;
      process.env.LOCAL_PREVIEW_ROUTING = "true";
      process.env.INGRESS_PORT = "8080";

      const url = generatePublicUrl("pr-my-app-42", "preview.example.com");
      expect(url).toBe("http://pr-my-app-42.localhost:8080/");

      // Restore original values
      process.env.LOCAL_PREVIEW_ROUTING = originalValue;
      process.env.INGRESS_PORT = originalPort;
    });

    it("should generate image tags", () => {
      const tag = generateImageTag("my-app", 42, "abc1234567890");
      expect(tag).toBe("pr-42-abc1234");
    });
  });

  describe("Deployment Operations", () => {
    it("should create a preview deployment", async () => {
      // Use nginx as a simple test image that will start quickly
      const result = await deployPreviewApplication({
        namespace: testNamespace,
        deploymentName: testDeploymentName,
        imageUri: "nginx:alpine",
        prNumber: testPrNumber,
        commitSha: testCommitSha,
        containerPort: 80,
        resourceLimits: { cpu: "100m", memory: "128Mi" },
        resourceRequests: { cpu: "50m", memory: "64Mi" },
      });

      expect(result.success).toBe(true);
      expect(result.deploymentName).toBe(testDeploymentName);
      expect(result.serviceName).toBe(testDeploymentName);
    });

    it("should get deployment status", async () => {
      // Give the deployment a moment to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const status = await getPreviewDeploymentStatus(
        testNamespace,
        testDeploymentName,
      );

      expect(status).toBeDefined();
      expect(["pending", "progressing", "available", "failed"]).toContain(
        status.status,
      );
    });

    it("should watch deployment until ready", async () => {
      // Watch with a shorter timeout for testing
      const status = await watchDeploymentUntilReady(
        testNamespace,
        testDeploymentName,
        60000, // 1 minute timeout
      );

      // nginx:alpine should start quickly
      expect(status.status).toBe("available");
      expect(status.ready).toBe(true);
      expect(status.readyReplicas).toBeGreaterThanOrEqual(1);
    }, 30000);

    it("should handle deployment update (idempotent)", async () => {
      // Creating again should update, not error
      const result = await deployPreviewApplication({
        namespace: testNamespace,
        deploymentName: testDeploymentName,
        imageUri: "nginx:alpine",
        prNumber: testPrNumber,
        commitSha: "updated123",
        containerPort: 80,
      });

      expect(result.success).toBe(true);
    });

    it("should delete preview deployment", async () => {
      const result = await deletePreviewDeployment(
        testNamespace,
        testDeploymentName,
      );

      expect(result.success).toBe(true);

      // Verify it's actually deleted
      const status = await getPreviewDeploymentStatus(
        testNamespace,
        testDeploymentName,
      );
      expect(status.status).toBe("failed"); // Should fail to find it
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent deployment gracefully", async () => {
      const status = await getPreviewDeploymentStatus(
        testNamespace,
        "non-existent-deployment-xyz",
      );

      expect(status.ready).toBe(false);
      expect(status.status).toBe("failed");
      expect(status.error).toBeDefined();
    });

    it("should handle deletion of non-existent deployment", async () => {
      const result = await deletePreviewDeployment(
        testNamespace,
        "non-existent-deployment-xyz",
      );

      // Should succeed (idempotent - nothing to delete is fine)
      expect(result.success).toBe(true);
    });
  });
});
