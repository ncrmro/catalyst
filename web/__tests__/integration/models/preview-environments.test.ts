/**
 * Integration tests for preview environments orchestration
 *
 * Tests the full deployment workflow:
 * - createPreviewDeployment: Coordinate database → K8s → GitHub comment
 * - Full end-to-end deployment flow with mocked external APIs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPreviewDeployment } from "@/models/preview-environments";
import { db } from "@/db";
import { pullRequestPods } from "@/db/schema";
import { eq } from "drizzle-orm";

// Mock external dependencies
const mockRequest = vi.fn();
vi.mock("@/lib/github", () => ({
  getInstallationOctokit: vi.fn(async () => ({
    request: mockRequest,
  })),
}));

describe("createPreviewDeployment - Integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Setup default successful GitHub API response
    mockRequest.mockResolvedValue({ data: { id: 12345 } });

    // Clean up any existing test pods
    await db
      .delete(pullRequestPods)
      .where(eq(pullRequestPods.namespace, "pr-test-repo-123"));
  });

  afterEach(async () => {
    // Cleanup test data
    await db
      .delete(pullRequestPods)
      .where(eq(pullRequestPods.namespace, "pr-test-repo-123"));
  });

  it("should create full preview deployment workflow", async () => {
    const result = await createPreviewDeployment({
      pullRequestId: "test-pr-id",
      repoName: "test-repo",
      repoOwner: "test-owner",
      prNumber: 123,
      branch: "feature/test",
      commitSha: "abc123def456",
      imageTag: "pr-123",
      installationId: 12345,
    });

    expect(result.success).toBe(true);
    expect(result.pod).toBeDefined();
    expect(result.pod?.namespace).toBe("pr-test-repo-123");
    expect(result.pod?.status).toBe("pending");
    expect(result.publicUrl).toMatch(/^https:\/\/pr-test-repo-123\./);

    // Verify database record was created
    const pods = await db
      .select()
      .from(pullRequestPods)
      .where(eq(pullRequestPods.namespace, "pr-test-repo-123"));
    expect(pods).toHaveLength(1);
    expect(pods[0].commitSha).toBe("abc123def456");
  });

  it("should generate correct namespace and public URL", async () => {
    const result = await createPreviewDeployment({
      pullRequestId: "test-pr-id",
      repoName: "My_Test-Repo",
      repoOwner: "test-owner",
      prNumber: 456,
      branch: "feature/test",
      commitSha: "def456abc123",
      imageTag: "pr-456",
      installationId: 12345,
    });

    expect(result.success).toBe(true);
    // Namespace should be DNS-1123 compliant (lowercase, hyphens for underscores)
    expect(result.pod?.namespace).toMatch(/^pr-[a-z0-9-]+-456$/);
    expect(result.publicUrl).toMatch(/^https:\/\//);
  });

  it("should deploy Helm chart with correct values", async () => {
    const result = await createPreviewDeployment({
      pullRequestId: "test-pr-id",
      repoName: "test-repo",
      repoOwner: "test-owner",
      prNumber: 789,
      branch: "feature/helm",
      commitSha: "helm123abc",
      imageTag: "pr-789",
      installationId: 12345,
    });

    expect(result.success).toBe(true);
    expect(result.helmRelease).toBeDefined();
    // Verify Helm chart was "deployed" (in our mock)
    expect(result.helmRelease?.releaseName).toContain("pr-test-repo-789");
  });

  it("should post GitHub comment with deployment info", async () => {
    mockRequest.mockResolvedValueOnce({ data: { id: 98765 } });

    const result = await createPreviewDeployment({
      pullRequestId: "test-pr-id",
      repoName: "test-repo",
      repoOwner: "test-owner",
      prNumber: 111,
      branch: "feature/comment",
      commitSha: "comment123",
      imageTag: "pr-111",
      installationId: 12345,
    });

    expect(result.success).toBe(true);
    expect(result.githubComment).toBeDefined();
    expect(result.githubComment?.commentId).toBe(98765);

    // Verify GitHub API was called
    expect(mockRequest).toHaveBeenCalledWith(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      expect.objectContaining({
        owner: "test-owner",
        repo: "test-repo",
        issue_number: 111,
      }),
    );
  });

  it("should handle deployment failures gracefully", async () => {
    const result = await createPreviewDeployment({
      pullRequestId: "test-pr-id",
      repoName: "test-repo",
      repoOwner: "test-owner",
      prNumber: 999,
      branch: "feature/fail",
      commitSha: "fail123",
      imageTag: "pr-999",
      installationId: 12345,
      // Force failure by using invalid chart path
      chartPath: "./charts/invalid",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // Verify pod was still created but marked as failed
    const pods = await db
      .select()
      .from(pullRequestPods)
      .where(eq(pullRequestPods.commitSha, "fail123"));
    expect(pods).toHaveLength(1);
    expect(pods[0].status).toBe("failed");
    expect(pods[0].errorMessage).toBeDefined();
  });

  it("should handle idempotency with same commit SHA", async () => {
    // First deployment
    const result1 = await createPreviewDeployment({
      pullRequestId: "test-pr-id",
      repoName: "test-repo",
      repoOwner: "test-owner",
      prNumber: 555,
      branch: "feature/idempotent",
      commitSha: "same-commit-sha",
      imageTag: "pr-555",
      installationId: 12345,
    });

    expect(result1.success).toBe(true);

    // Second deployment with same commit SHA should be idempotent
    const result2 = await createPreviewDeployment({
      pullRequestId: "test-pr-id",
      repoName: "test-repo",
      repoOwner: "test-owner",
      prNumber: 555,
      branch: "feature/idempotent",
      commitSha: "same-commit-sha",
      imageTag: "pr-555",
      installationId: 12345,
    });

    expect(result2.success).toBe(true);
    // Should return existing deployment, not create duplicate
    expect(result2.pod?.id).toBe(result1.pod?.id);
  });

  it("should update database status after successful deployment", async () => {
    const result = await createPreviewDeployment({
      pullRequestId: "test-pr-id",
      repoName: "test-repo",
      repoOwner: "test-owner",
      prNumber: 222,
      branch: "feature/status",
      commitSha: "status123",
      imageTag: "pr-222",
      installationId: 12345,
    });

    expect(result.success).toBe(true);

    // Verify pod record has correct deployment info
    const pods = await db
      .select()
      .from(pullRequestPods)
      .where(eq(pullRequestPods.commitSha, "status123"));

    expect(pods).toHaveLength(1);
    expect(pods[0].publicUrl).toBeDefined();
    expect(pods[0].deploymentName).toBeDefined();
    expect(pods[0].imageTag).toBe("pr-222");
  });

  it("should set resource allocation in database", async () => {
    const result = await createPreviewDeployment({
      pullRequestId: "test-pr-id",
      repoName: "test-repo",
      repoOwner: "test-owner",
      prNumber: 333,
      branch: "feature/resources",
      commitSha: "resources123",
      imageTag: "pr-333",
      installationId: 12345,
      resources: {
        cpu: "1000m",
        memory: "1Gi",
        pods: 2,
      },
    });

    expect(result.success).toBe(true);

    const pods = await db
      .select()
      .from(pullRequestPods)
      .where(eq(pullRequestPods.commitSha, "resources123"));

    expect(pods[0].resourcesAllocated).toEqual({
      cpu: "1000m",
      memory: "1Gi",
      pods: 2,
    });
  });
});
