/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db, pullRequests, repos, teams, users } from "@/db";
import { inArray, eq } from "drizzle-orm";
import {
  getPullRequests,
  getPullRequestsWithRepos,
  findPullRequestByProvider,
  upsertPullRequests,
} from "@/models/pull-requests";
import {
  userFactory,
  teamFactory,
  repoFactory,
  pullRequestFactory,
} from "../../factories";

/**
 * Integration tests for pull-requests model
 *
 * Tests all model functions with real database operations
 */
describe("Pull Requests Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testRepoId: string;
  const createdPullRequestIds: string[] = [];

  beforeAll(async () => {
    // Create test user for team ownership
    const testUser = await userFactory.create({
      name: "Pull Requests Test User",
    });
    testUserId = testUser.id;

    // Create test team
    const testTeam = await teamFactory.create({ ownerId: testUserId });
    testTeamId = testTeam.id;

    // Create test repo
    const testRepo = await repoFactory.create({
      teamId: testTeamId,
      name: "Test Repo for PRs",
    });
    testRepoId = testRepo.id;
  });

  afterAll(async () => {
    // Clean up all created pull requests
    if (createdPullRequestIds.length > 0) {
      await db
        .delete(pullRequests)
        .where(inArray(pullRequests.id, createdPullRequestIds));
    }

    // Clean up repo, team and user (cascades will handle related data)
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

  beforeEach(() => {
    // Reset created pull requests list for tracking
    createdPullRequestIds.length = 0;
  });

  describe("getPullRequests", () => {
    it("should return pull requests by IDs", async () => {
      const [pr1, pr2] = await Promise.all([
        pullRequestFactory.create({
          repoId: testRepoId,
          title: "PR 1",
          providerPrId: "pr-1",
        }),
        pullRequestFactory.create({
          repoId: testRepoId,
          title: "PR 2",
          providerPrId: "pr-2",
        }),
      ]);

      createdPullRequestIds.push(pr1.id, pr2.id);

      const result = await getPullRequests({ ids: [pr1.id, pr2.id] });

      expect(result).toHaveLength(2);
      expect(result.map((pr) => pr.title)).toContain("PR 1");
      expect(result.map((pr) => pr.title)).toContain("PR 2");
    });

    it("should return pull requests by repo IDs", async () => {
      const pr = await pullRequestFactory.create({
        repoId: testRepoId,
        title: "PR by Repo",
        providerPrId: "pr-repo-1",
      });
      createdPullRequestIds.push(pr.id);

      const result = await getPullRequests({ repoIds: [testRepoId] });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((p) => p.id === pr.id)).toBe(true);
    });

    it("should filter by state", async () => {
      const [openPr, closedPr] = await Promise.all([
        pullRequestFactory.create({
          repoId: testRepoId,
          state: "open",
          providerPrId: "pr-open-1",
        }),
        pullRequestFactory.create({
          repoId: testRepoId,
          state: "closed",
          providerPrId: "pr-closed-1",
        }),
      ]);

      createdPullRequestIds.push(openPr.id, closedPr.id);

      const openPrs = await getPullRequests({
        repoIds: [testRepoId],
        state: "open",
      });
      const closedPrs = await getPullRequests({
        repoIds: [testRepoId],
        state: "closed",
      });

      expect(openPrs.some((pr) => pr.id === openPr.id)).toBe(true);
      expect(closedPrs.some((pr) => pr.id === closedPr.id)).toBe(true);
      expect(openPrs.every((pr) => pr.state === "open")).toBe(true);
      expect(closedPrs.every((pr) => pr.state === "closed")).toBe(true);
    });

    it("should filter by provider", async () => {
      const pr = await pullRequestFactory.create({
        repoId: testRepoId,
        provider: "github",
        providerPrId: "pr-github-1",
      });
      createdPullRequestIds.push(pr.id);

      const result = await getPullRequests({
        repoIds: [testRepoId],
        provider: "github",
      });

      expect(result.some((p) => p.id === pr.id)).toBe(true);
      expect(result.every((p) => p.provider === "github")).toBe(true);
    });

    it("should respect limit parameter", async () => {
      // Create multiple PRs
      const prs = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          pullRequestFactory.create({
            repoId: testRepoId,
            providerPrId: `pr-limit-${i}`,
          }),
        ),
      );

      createdPullRequestIds.push(...prs.map((pr) => pr.id));

      const result = await getPullRequests({ repoIds: [testRepoId], limit: 5 });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should return empty array when no conditions provided", async () => {
      const result = await getPullRequests({});

      expect(result).toEqual([]);
    });

    it("should return empty array when no PRs match", async () => {
      const result = await getPullRequests({ ids: ["non-existent-id"] });

      expect(result).toEqual([]);
    });
  });

  describe("getPullRequestsWithRepos", () => {
    it("should return pull requests with repository information", async () => {
      const pr = await pullRequestFactory.create({
        repoId: testRepoId,
        title: "PR with Repo",
        providerPrId: "pr-with-repo-1",
      });
      createdPullRequestIds.push(pr.id);

      const result = await getPullRequestsWithRepos({ ids: [pr.id] });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("pullRequest");
      expect(result[0]).toHaveProperty("repo");
      expect(result[0].pullRequest.title).toBe("PR with Repo");
      expect(result[0].repo.id).toBe(testRepoId);
    });

    it("should filter by state with repo info", async () => {
      const pr = await pullRequestFactory.create({
        repoId: testRepoId,
        state: "merged",
        providerPrId: "pr-merged-1",
      });
      createdPullRequestIds.push(pr.id);

      const result = await getPullRequestsWithRepos({
        repoIds: [testRepoId],
        state: "merged",
      });

      expect(result.some((r) => r.pullRequest.id === pr.id)).toBe(true);
      expect(result.every((r) => r.pullRequest.state === "merged")).toBe(true);
    });

    it("should return empty array when no conditions provided", async () => {
      const result = await getPullRequestsWithRepos({});

      expect(result).toEqual([]);
    });
  });

  describe("findPullRequestByProvider", () => {
    it("should find pull request by provider data", async () => {
      const pr = await pullRequestFactory.create({
        repoId: testRepoId,
        provider: "github",
        providerPrId: "unique-pr-123",
      });
      createdPullRequestIds.push(pr.id);

      const found = await findPullRequestByProvider(
        testRepoId,
        "github",
        "unique-pr-123",
      );

      expect(found).toBeDefined();
      expect(found?.id).toBe(pr.id);
      expect(found?.providerPrId).toBe("unique-pr-123");
    });

    it("should return null when PR not found", async () => {
      const found = await findPullRequestByProvider(
        testRepoId,
        "github",
        "non-existent-pr-id",
      );

      expect(found).toBeNull();
    });

    it("should differentiate PRs by provider", async () => {
      const githubPr = await pullRequestFactory.create({
        repoId: testRepoId,
        provider: "github",
        providerPrId: "pr-456",
      });
      createdPullRequestIds.push(githubPr.id);

      const found = await findPullRequestByProvider(
        testRepoId,
        "gitlab",
        "pr-456",
      );

      expect(found).toBeNull();
    });
  });

  describe("upsertPullRequests", () => {
    it("should create new pull request when it doesn't exist", async () => {
      const prData = pullRequestFactory.build({
        repoId: testRepoId,
        provider: "github",
        providerPrId: "new-pr-789",
        title: "New PR",
      });

      const results = await upsertPullRequests(prData);
      createdPullRequestIds.push(results[0].pullRequest.id);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("create");
      expect(results[0].pullRequest.title).toBe("New PR");
      expect(results[0].pullRequest.providerPrId).toBe("new-pr-789");
    });

    it("should update existing pull request when it exists", async () => {
      // Create initial PR
      const prData = pullRequestFactory.build({
        repoId: testRepoId,
        provider: "github",
        providerPrId: "update-pr-101",
        title: "Original Title",
        state: "open",
      });

      const [created] = await upsertPullRequests(prData);
      createdPullRequestIds.push(created.pullRequest.id);

      expect(created.operation).toBe("create");

      // Update the PR
      const updatedData = {
        ...prData,
        title: "Updated Title",
        state: "closed",
      };

      const [updated] = await upsertPullRequests(updatedData);

      expect(updated.operation).toBe("update");
      expect(updated.pullRequest.id).toBe(created.pullRequest.id);
      expect(updated.pullRequest.title).toBe("Updated Title");
      expect(updated.pullRequest.state).toBe("closed");
    });

    it("should handle multiple PRs in bulk", async () => {
      const prsData = [
        pullRequestFactory.build({
          repoId: testRepoId,
          provider: "github",
          providerPrId: "bulk-pr-1",
        }),
        pullRequestFactory.build({
          repoId: testRepoId,
          provider: "github",
          providerPrId: "bulk-pr-2",
        }),
        pullRequestFactory.build({
          repoId: testRepoId,
          provider: "github",
          providerPrId: "bulk-pr-3",
        }),
      ];

      const results = await upsertPullRequests(prsData);
      createdPullRequestIds.push(...results.map((r) => r.pullRequest.id));

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.operation === "create")).toBe(true);
    });

    it("should properly handle JSON fields in arrays", async () => {
      const prData = pullRequestFactory.build({
        repoId: testRepoId,
        provider: "github",
        providerPrId: "json-pr-1",
        labels: ["bug", "high-priority"],
        assignees: ["user1", "user2"],
        reviewers: ["reviewer1"],
      });

      const [result] = await upsertPullRequests(prData);
      createdPullRequestIds.push(result.pullRequest.id);

      expect(result.pullRequest.labels).toBeDefined();
      expect(result.pullRequest.assignees).toBeDefined();
      expect(result.pullRequest.reviewers).toBeDefined();
    });

    it("should update timestamps on upsert", async () => {
      const prData = pullRequestFactory.build({
        repoId: testRepoId,
        provider: "github",
        providerPrId: "timestamp-pr-1",
      });

      const [created] = await upsertPullRequests(prData);
      createdPullRequestIds.push(created.pullRequest.id);

      const originalUpdatedAt = created.pullRequest.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Update the same PR
      const [updated] = await upsertPullRequests(prData);

      expect(updated.pullRequest.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });
  });
});
