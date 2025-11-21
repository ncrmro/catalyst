/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, pullRequestPods, pullRequests, repos, teams, users } from "@/db";
import { inArray, eq } from "drizzle-orm";
import {
  generateNamespace,
  generatePublicUrl,
  listActivePreviewPods,
} from "@/models/preview-environments";
import {
  userFactory,
  teamFactory,
  repoFactory,
  pullRequestFactory,
} from "../../factories";

/**
 * Integration tests for preview-environments model
 *
 * Tests all model functions with real database operations
 */
describe("Preview Environments Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testRepoId: string;
  let testPullRequestId: string;
  const createdPodIds: string[] = [];

  beforeAll(async () => {
    // Create test user for team ownership
    const testUser = await userFactory.create({
      name: "Preview Envs Test User",
    });
    testUserId = testUser.id;

    // Create test team
    const testTeam = await teamFactory.create({ ownerId: testUserId });
    testTeamId = testTeam.id;

    // Create test repo
    const testRepo = await repoFactory.create({
      teamId: testTeamId,
      name: "test-repo",
      fullName: "test-org/test-repo",
    });
    testRepoId = testRepo.id;

    // Create test pull request
    const testPR = await pullRequestFactory.create({
      repoId: testRepoId,
      number: 123,
      title: "Test PR for Preview Environments",
      headBranch: "feature-test",
    });
    testPullRequestId = testPR.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (createdPodIds.length > 0) {
      await db
        .delete(pullRequestPods)
        .where(inArray(pullRequestPods.id, createdPodIds));
    }

    if (testPullRequestId) {
      await db
        .delete(pullRequests)
        .where(eq(pullRequests.id, testPullRequestId));
    }

    if (testRepoId) {
      await db.delete(repos).where(eq(repos.id, testRepoId));
    }

    if (testTeamId) {
      await db.delete(teams).where(eq(teams.id, testTeamId));
    }

    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe("generateNamespace", () => {
    it("should generate valid DNS-1123 namespace", () => {
      const namespace = generateNamespace("test-repo", 123);
      expect(namespace).toBe("pr-test-repo-123");
    });

    it("should sanitize repo names with special characters", () => {
      const namespace = generateNamespace("Test_Repo@Name!", 456);
      expect(namespace).toBe("pr-test-repo-name-456");
    });

    it("should handle uppercase repo names", () => {
      const namespace = generateNamespace("MyTestRepo", 789);
      expect(namespace).toBe("pr-mytestrepo-789");
    });

    it("should truncate long repo names to fit DNS-1123 limit", () => {
      const longRepoName = "a".repeat(100);
      const namespace = generateNamespace(longRepoName, 999);
      expect(namespace.length).toBeLessThanOrEqual(63);
      expect(namespace).toMatch(/^pr-a+-999$/);
    });

    it("should remove leading and trailing hyphens", () => {
      const namespace = generateNamespace("-test-repo-", 111);
      expect(namespace).toBe("pr-test-repo-111");
    });

    it("should collapse multiple hyphens", () => {
      const namespace = generateNamespace("test---repo", 222);
      expect(namespace).toBe("pr-test-repo-222");
    });
  });

  describe("generatePublicUrl", () => {
    it("should generate URL with default domain", () => {
      const url = generatePublicUrl("pr-test-repo-123");
      expect(url).toMatch(/^https:\/\/pr-test-repo-123\./);
    });

    it("should use custom base domain", () => {
      const url = generatePublicUrl("pr-test-repo-123", "example.com");
      expect(url).toBe("https://pr-test-repo-123.example.com");
    });

    it("should use environment variable if set", () => {
      const originalDomain = process.env.PREVIEW_BASE_DOMAIN;
      process.env.PREVIEW_BASE_DOMAIN = "test.example.com";
      
      const url = generatePublicUrl("pr-test-repo-456");
      expect(url).toBe("https://pr-test-repo-456.test.example.com");
      
      // Restore original value
      if (originalDomain) {
        process.env.PREVIEW_BASE_DOMAIN = originalDomain;
      } else {
        delete process.env.PREVIEW_BASE_DOMAIN;
      }
    });
  });

  describe("listActivePreviewPods", () => {
    beforeAll(async () => {
      // Create test preview pods
      const pod1 = await db
        .insert(pullRequestPods)
        .values({
          pullRequestId: testPullRequestId,
          commitSha: "abc123" + "0".repeat(34), // 40 char SHA
          namespace: "pr-test-repo-123",
          deploymentName: "preview-test-repo-123",
          status: "running",
          publicUrl: "https://pr-test-repo-123.preview.local",
          branch: "feature-branch",
          resourcesAllocated: {
            cpu: "500m",
            memory: "512Mi",
            pods: 1,
          },
        })
        .returning();
      createdPodIds.push(pod1[0].id);

      const pod2 = await db
        .insert(pullRequestPods)
        .values({
          pullRequestId: testPullRequestId,
          commitSha: "def456" + "0".repeat(34), // 40 char SHA
          namespace: "pr-test-repo-124",
          deploymentName: "preview-test-repo-124",
          status: "deploying",
          publicUrl: "https://pr-test-repo-124.preview.local",
          branch: "feature-branch-2",
          resourcesAllocated: {
            cpu: "500m",
            memory: "512Mi",
            pods: 1,
          },
        })
        .returning();
      createdPodIds.push(pod2[0].id);
    });

    it("should list pods by IDs", async () => {
      const pods = await listActivePreviewPods({
        ids: [createdPodIds[0]],
      });

      expect(pods.length).toBe(1);
      expect(pods[0].id).toBe(createdPodIds[0]);
    });

    it("should list pods by pull request IDs", async () => {
      const pods = await listActivePreviewPods({
        pullRequestIds: [testPullRequestId],
      });

      expect(pods.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter pods by status", async () => {
      const runningPods = await listActivePreviewPods({
        pullRequestIds: [testPullRequestId],
        status: "running",
      });

      expect(runningPods.length).toBeGreaterThanOrEqual(1);
      expect(runningPods[0].status).toBe("running");
    });

    it("should filter pods by team", async () => {
      const pods = await listActivePreviewPods({
        teamIds: [testTeamId],
      });

      expect(pods.length).toBeGreaterThanOrEqual(2);
      // When filtering by team, result includes joins
      expect(pods[0]).toHaveProperty("pod");
      expect(pods[0]).toHaveProperty("pullRequest");
      expect(pods[0]).toHaveProperty("repo");
    });

    it("should return empty array when no conditions provided", async () => {
      const pods = await listActivePreviewPods({});
      expect(pods).toEqual([]);
    });

    it("should respect limit parameter", async () => {
      const pods = await listActivePreviewPods({
        pullRequestIds: [testPullRequestId],
        limit: 1,
      });

      expect(pods.length).toBe(1);
    });
  });
});
