/**
 * @vitest-environment node
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { createMocks } from "node-mocks-http";
import crypto from "crypto";
import { POST } from "@/app/api/github/webhook/route";
import { db, pullRequests, repos, teams, users } from "@/db";
import { eq, and } from "drizzle-orm";

// Mock the VCS providers configuration
vi.mock("@/lib/vcs-providers", () => ({
  getInstallationOctokit: vi.fn(),
  GITHUB_CONFIG: {
    WEBHOOK_SECRET: "integration-test-webhook-secret",
    PAT: "mock-github-pat-for-integration-tests",
  },
}));

// Mock the preview environments model (not needed for database integration tests)
vi.mock("@/models/preview-environments", () => ({
  createPreviewDeployment: vi.fn().mockResolvedValue({ success: true }),
  deletePreviewDeploymentOrchestrated: vi
    .fn()
    .mockResolvedValue({ success: true }),
}));

/**
 * Integration test for GitHub webhook database operations
 *
 * This test verifies that the webhook endpoint actually creates pull request
 * records in the database when a repository exists. It uses a real database
 * connection and performs end-to-end testing.
 */
describe("GitHub Webhook Database Integration", () => {
  const mockWebhookSecret = "integration-test-webhook-secret";
  let testUserId: string;
  let testTeamId: string;
  let testRepoId: string;
  let testRepoGitHubId: number;

  function createSignature(payload: string, secret: string): string {
    return `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  }

  function createPullRequestPayload(action: string, prData: any = {}) {
    return {
      action,
      installation: { id: 12345 },
      pull_request: {
        id: 42,
        number: 42,
        title: "Integration Test PR",
        body: "This is an integration test pull request",
        state: "open" as const,
        draft: false,
        html_url: "https://github.com/test-org/test-repo/pull/42",
        user: {
          login: "testuser",
          avatar_url: "https://github.com/testuser.png",
        },
        head: { ref: "feature/integration-test", sha: "abc123def456789" },
        base: { ref: "main" },
        comments: 2,
        changed_files: 3,
        additions: 50,
        deletions: 10,
        labels: [{ name: "test" }, { name: "integration" }],
        assignees: [{ login: "assignee1" }],
        requested_reviewers: [{ login: "reviewer1" }],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
        ...prData,
      },
      repository: {
        id: testRepoGitHubId,
        full_name: "test-org/test-repo",
        owner: { login: "test-org" },
        name: "test-repo",
      },
    };
  }

  beforeAll(async () => {
    testRepoGitHubId = Math.floor(Math.random() * 1000000) + 100000; // Random GitHub ID for testing

    // Create test user first
    const [testUser] = await db
      .insert(users)
      .values({
        name: "Integration Test User",
        email: "integration-test@example.com",
      })
      .returning();

    testUserId = testUser.id;

    // Create test team and repository in database
    const [testTeam] = await db
      .insert(teams)
      .values({
        name: "test-team-integration",
        ownerId: testUserId,
      })
      .returning();

    testTeamId = testTeam.id;

    const [testRepo] = await db
      .insert(repos)
      .values({
        name: "test-repo",
        fullName: "test-org/test-repo",
        description: "Integration test repository",
        url: "https://github.com/test-org/test-repo",
        githubId: testRepoGitHubId,
        ownerLogin: "test-org",
        ownerType: "Organization",
        teamId: testTeamId,
      })
      .returning();

    testRepoId = testRepo.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testRepoId) {
      // Pull requests will be cleaned up by cascade delete
      await db.delete(repos).where(eq(repos.id, testRepoId));
    }
    if (testTeamId) {
      await db.delete(teams).where(eq(teams.id, testTeamId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  beforeEach(async () => {
    // Clean up any existing pull requests for this repo
    await db.delete(pullRequests).where(eq(pullRequests.repoId, testRepoId));
  });

  it("should create pull request record in database when webhook is received", async () => {
    const payload = createPullRequestPayload("opened");
    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, mockWebhookSecret);

    const { req } = createMocks({
      method: "POST",
      headers: {
        "x-github-event": "pull_request",
        "x-github-delivery": "integration-test-delivery-123",
        "x-hub-signature-256": signature,
        "content-type": "application/json",
      },
      body: Buffer.from(payloadString),
    });

    // Mock request.text() to return the payload
    req.text = async () => payloadString;

    // Call the webhook endpoint
    const response = await POST(req as any);
    const responseData = await response.json();

    // Verify webhook response
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    // Verify pull request was created in database
    const createdPrs = await db
      .select()
      .from(pullRequests)
      .where(
        and(
          eq(pullRequests.repoId, testRepoId),
          eq(pullRequests.provider, "github"),
          eq(pullRequests.providerPrId, "42"),
        ),
      );

    expect(createdPrs).toHaveLength(1);

    const createdPr = createdPrs[0];
    expect(createdPr.title).toBe("Integration Test PR");
    expect(createdPr.number).toBe(42);
    expect(createdPr.state).toBe("open");
    expect(createdPr.status).toBe("ready");
    expect(createdPr.authorLogin).toBe("testuser");
    expect(createdPr.headBranch).toBe("feature/integration-test");
    expect(createdPr.baseBranch).toBe("main");
    expect(createdPr.commentsCount).toBe(2);
    expect(createdPr.changedFilesCount).toBe(3);
    expect(createdPr.additionsCount).toBe(50);
    expect(createdPr.deletionsCount).toBe(10);

    // Verify JSON fields are properly serialized
    expect(JSON.parse(createdPr.labels || "[]")).toEqual([
      "test",
      "integration",
    ]);
    expect(JSON.parse(createdPr.assignees || "[]")).toEqual(["assignee1"]);
    expect(JSON.parse(createdPr.reviewers || "[]")).toEqual(["reviewer1"]);
  });

  it("should update existing pull request record on subsequent webhook events", async () => {
    // First, create a pull request via webhook
    const payload1 = createPullRequestPayload("opened");
    const payloadString1 = JSON.stringify(payload1);
    const signature1 = createSignature(payloadString1, mockWebhookSecret);

    const { req: req1 } = createMocks({
      method: "POST",
      headers: {
        "x-github-event": "pull_request",
        "x-github-delivery": "integration-test-delivery-124",
        "x-hub-signature-256": signature1,
        "content-type": "application/json",
      },
      body: Buffer.from(payloadString1),
    });

    req1.text = async () => payloadString1;
    await POST(req1 as any);

    // Verify initial creation
    let pullRequestsInDb = await db
      .select()
      .from(pullRequests)
      .where(eq(pullRequests.repoId, testRepoId));

    expect(pullRequestsInDb).toHaveLength(1);
    expect(pullRequestsInDb[0].title).toBe("Integration Test PR");

    // Now send an update webhook
    const payload2 = createPullRequestPayload("synchronize", {
      title: "Updated Integration Test PR",
      comments: 5,
      changed_files: 6,
      additions: 100,
      deletions: 20,
    });
    const payloadString2 = JSON.stringify(payload2);
    const signature2 = createSignature(payloadString2, mockWebhookSecret);

    const { req: req2 } = createMocks({
      method: "POST",
      headers: {
        "x-github-event": "pull_request",
        "x-github-delivery": "integration-test-delivery-125",
        "x-hub-signature-256": signature2,
        "content-type": "application/json",
      },
      body: Buffer.from(payloadString2),
    });

    req2.text = async () => payloadString2;
    const response2 = await POST(req2 as any);
    const responseData2 = await response2.json();

    // Verify webhook response
    expect(response2.status).toBe(200);
    expect(responseData2.success).toBe(true);

    // Verify pull request was updated (not duplicated)
    pullRequestsInDb = await db
      .select()
      .from(pullRequests)
      .where(eq(pullRequests.repoId, testRepoId));

    expect(pullRequestsInDb).toHaveLength(1); // Still only one record

    const updatedPr = pullRequestsInDb[0];
    expect(updatedPr.title).toBe("Updated Integration Test PR");
    expect(updatedPr.commentsCount).toBe(5);
    expect(updatedPr.changedFilesCount).toBe(6);
    expect(updatedPr.additionsCount).toBe(100);
    expect(updatedPr.deletionsCount).toBe(20);
  });

  it("should handle merged pull request webhook correctly", async () => {
    const mergedAt = new Date("2024-01-01T02:00:00Z");
    const payload = createPullRequestPayload("closed", {
      state: "closed",
      merged_at: mergedAt.toISOString(),
      closed_at: mergedAt.toISOString(),
    });
    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, mockWebhookSecret);

    const { req } = createMocks({
      method: "POST",
      headers: {
        "x-github-event": "pull_request",
        "x-github-delivery": "integration-test-delivery-126",
        "x-hub-signature-256": signature,
        "content-type": "application/json",
      },
      body: Buffer.from(payloadString),
    });

    req.text = async () => payloadString;

    const response = await POST(req as any);
    const responseData = await response.json();

    // Verify webhook response
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    // Verify pull request was created with merged state
    const createdPrs = await db
      .select()
      .from(pullRequests)
      .where(eq(pullRequests.repoId, testRepoId));

    expect(createdPrs).toHaveLength(1);

    const createdPr = createdPrs[0];
    expect(createdPr.state).toBe("merged");
    expect(createdPr.mergedAt).toEqual(mergedAt);
    expect(createdPr.closedAt).toEqual(mergedAt);
  });

  it("should skip database operations when repository is not found", async () => {
    // Use a non-existent GitHub repository ID
    const nonExistentGitHubId = 999999999;
    const payload = {
      action: "opened",
      installation: { id: 12345 },
      pull_request: {
        id: 999,
        number: 999,
        title: "Non-existent Repo PR",
        state: "open" as const,
        draft: false,
        html_url: "https://github.com/non-existent/repo/pull/999",
        user: { login: "testuser" },
        head: { ref: "feature/test", sha: "def456abc789012" },
        base: { ref: "main" },
        comments: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
      },
      repository: {
        id: nonExistentGitHubId,
        full_name: "non-existent/repo",
        owner: { login: "non-existent" },
        name: "repo",
      },
    };
    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, mockWebhookSecret);

    const { req } = createMocks({
      method: "POST",
      headers: {
        "x-github-event": "pull_request",
        "x-github-delivery": "integration-test-delivery-127",
        "x-hub-signature-256": signature,
        "content-type": "application/json",
      },
      body: Buffer.from(payloadString),
    });

    req.text = async () => payloadString;

    const response = await POST(req as any);
    const responseData = await response.json();

    // Webhook should still succeed (for backwards compatibility)
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    // Verify no pull request was created in database
    const pullRequestsInDb = await db
      .select()
      .from(pullRequests)
      .where(eq(pullRequests.repoId, testRepoId));

    expect(pullRequestsInDb).toHaveLength(0);
  });
});
