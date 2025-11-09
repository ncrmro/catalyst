/**
 * Unit tests for preview environments models layer
 *
 * Tests helper functions for preview environment deployment:
 * - generateNamespace: Create DNS-1123 compliant namespace names
 * - generatePublicUrl: Construct public URLs for preview environments
 * - deployHelmChart: Deploy Helm charts to Kubernetes
 * - upsertGitHubComment: Post/update GitHub PR comments
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateNamespace,
  generatePublicUrl,
  deployHelmChart,
  upsertGitHubComment,
} from "@/models/preview-environments";

// Mock external API clients
vi.mock("@/lib/k8s-client", () => ({
  getClusterConfig: vi.fn(),
  getCoreV1Api: vi.fn(),
  getAppsV1Api: vi.fn(),
}));

const mockRequest = vi.fn();

vi.mock("@/lib/github", () => ({
  getInstallationOctokit: vi.fn(async () => ({
    request: mockRequest,
  })),
}));

describe("generateNamespace", () => {
  it("should generate DNS-1123 compliant namespace from repo and PR number", () => {
    const namespace = generateNamespace("my-repo", 123);
    expect(namespace).toBe("pr-my-repo-123");
  });

  it("should convert uppercase to lowercase", () => {
    const namespace = generateNamespace("My-Repo", 456);
    expect(namespace).toBe("pr-my-repo-456");
  });

  it("should replace underscores with hyphens", () => {
    const namespace = generateNamespace("my_repo_name", 789);
    expect(namespace).toBe("pr-my-repo-name-789");
  });

  it("should remove non-alphanumeric characters except hyphens", () => {
    const namespace = generateNamespace("my@repo#name!", 100);
    expect(namespace).toBe("pr-myreponame-100");
  });

  it("should handle repo names with slashes (owner/repo format)", () => {
    const namespace = generateNamespace("owner/repo-name", 200);
    expect(namespace).toBe("pr-ownerrepo-name-200");
  });

  it("should truncate to 63 characters (DNS-1123 limit)", () => {
    const longName = "a".repeat(100);
    const namespace = generateNamespace(longName, 999);
    expect(namespace.length).toBeLessThanOrEqual(63);
    expect(namespace).toMatch(/^pr-a+-999$/);
  });

  it("should not start or end with hyphens", () => {
    const namespace = generateNamespace("-my-repo-", 300);
    expect(namespace).toMatch(/^[a-z0-9]/);
    expect(namespace).toMatch(/[a-z0-9]$/);
  });
});

describe("generatePublicUrl", () => {
  it("should generate URL with namespace and domain", () => {
    const url = generatePublicUrl("pr-my-repo-123", "preview.example.com");
    expect(url).toBe("https://pr-my-repo-123.preview.example.com");
  });

  it("should handle custom domains", () => {
    const url = generatePublicUrl("pr-test-456", "apps.cluster.local");
    expect(url).toBe("https://pr-test-456.apps.cluster.local");
  });

  it("should use default domain if not provided", () => {
    const url = generatePublicUrl("pr-my-repo-789");
    expect(url).toMatch(/^https:\/\/pr-my-repo-789\./);
  });
});

describe("deployHelmChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should deploy Helm chart to namespace successfully", async () => {
    const result = await deployHelmChart({
      namespace: "pr-test-123",
      chartPath: "./charts/nextjs",
      releaseName: "pr-test-123-app",
      values: {
        image: {
          repository: "ghcr.io/test/app",
          tag: "pr-123",
        },
        resources: {
          limits: { cpu: "500m", memory: "512Mi" },
        },
      },
    });

    expect(result.success).toBe(true);
    expect(result.releaseName).toBe("pr-test-123-app");
    expect(result.namespace).toBe("pr-test-123");
  });

  it("should handle deployment failures gracefully", async () => {
    const result = await deployHelmChart({
      namespace: "pr-test-456",
      chartPath: "./charts/invalid",
      releaseName: "pr-test-456-app",
      values: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should validate required parameters", async () => {
    await expect(
      deployHelmChart({
        namespace: "",
        chartPath: "./charts/nextjs",
        releaseName: "test",
        values: {},
      })
    ).rejects.toThrow("namespace is required");
  });
});

describe("upsertGitHubComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default successful response
    mockRequest.mockResolvedValue({ data: { id: 12345 } });
  });

  it("should create new comment on PR when no existing comment", async () => {
    mockRequest.mockResolvedValueOnce({ data: { id: 98765 } });

    const result = await upsertGitHubComment({
      owner: "test-owner",
      repo: "test-repo",
      prNumber: 123,
      body: "🚀 Preview environment deployed at https://pr-test-123.preview.example.com",
      installationId: 12345,
    });

    expect(result.success).toBe(true);
    expect(result.commentId).toBe(98765);
    expect(result.action).toBe("created");
    expect(mockRequest).toHaveBeenCalledWith(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      expect.objectContaining({
        owner: "test-owner",
        repo: "test-repo",
        issue_number: 123,
      })
    );
  });

  it("should update existing comment when found", async () => {
    const result = await upsertGitHubComment({
      owner: "test-owner",
      repo: "test-repo",
      prNumber: 456,
      body: "✅ Preview environment updated at https://pr-test-456.preview.example.com",
      installationId: 12345,
      commentId: 789, // Existing comment ID
    });

    expect(result.success).toBe(true);
    expect(result.commentId).toBe(789);
    expect(result.action).toBe("updated");
    expect(mockRequest).toHaveBeenCalledWith(
      "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
      expect.objectContaining({
        owner: "test-owner",
        repo: "test-repo",
        comment_id: 789,
      })
    );
  });

  it("should handle GitHub API errors gracefully", async () => {
    mockRequest.mockRejectedValueOnce(new Error("API rate limit exceeded"));

    const result = await upsertGitHubComment({
      owner: "test-owner",
      repo: "test-repo",
      prNumber: 999,
      body: "Test comment",
      installationId: 99999, // Invalid installation
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should format deployment status in comment body", async () => {
    const result = await upsertGitHubComment({
      owner: "test-owner",
      repo: "test-repo",
      prNumber: 100,
      body: `## 🚀 Preview Environment

**Status**: Running
**URL**: https://pr-test-100.preview.example.com
**Deployed**: ${new Date().toISOString()}`,
      installationId: 12345,
    });

    expect(result.success).toBe(true);
  });
});
