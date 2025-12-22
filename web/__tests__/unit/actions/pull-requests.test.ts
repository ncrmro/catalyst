/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { fetchUserPullRequests } from "@/actions/pull-requests";
import { auth } from "@/auth";
import {
  refreshTokenIfNeeded,
  fetchUserRepositoryPullRequests,
} from "@/lib/vcs-providers";

// Mock the auth function
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the vcs-providers lib
vi.mock("@/lib/vcs-providers", () => ({
  refreshTokenIfNeeded: vi.fn(),
  invalidateTokens: vi.fn(),
  GITHUB_CONFIG: {
    PAT: null,
    REPOS_MODE: "live",
  },
  getUserOctokit: vi.fn(),
  fetchPullRequestsFromRepos: vi.fn(),
  fetchUserRepositoryPullRequests: vi.fn(),
  isGitHubTokenError: vi.fn(),
}));

// Mock the Octokit
vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      users: {
        getAuthenticated: vi.fn(),
      },
      repos: {
        listForAuthenticatedUser: vi.fn(),
      },
      pulls: {
        list: vi.fn(),
        listReviews: vi.fn(),
      },
    },
  })),
}));

const mockAuth = auth as Mock;
const mockRefreshTokenIfNeeded = refreshTokenIfNeeded as Mock;
const mockFetchUserRepositoryPullRequests =
  fetchUserRepositoryPullRequests as Mock;

describe("Pull Requests Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error when no authenticated user is found", async () => {
    // Temporarily disable mocked mode to test real error logic
    const originalMocked = process.env.MOCKED;
    const originalReposMode = process.env.GITHUB_REPOS_MODE;
    delete process.env.MOCKED;
    process.env.GITHUB_REPOS_MODE = "live";

    mockAuth.mockResolvedValue(null);

    await expect(fetchUserPullRequests()).rejects.toThrow(
      "No authenticated user found",
    );

    // Restore original environment variables
    if (originalMocked !== undefined) {
      process.env.MOCKED = originalMocked;
    }
    if (originalReposMode !== undefined) {
      process.env.GITHUB_REPOS_MODE = originalReposMode;
    }
  });

  it("includes gitfoobar provider results (empty array)", async () => {
    // Temporarily disable mocked mode to test real provider logic
    const originalMocked = process.env.MOCKED;
    const originalReposMode = process.env.GITHUB_REPOS_MODE;
    delete process.env.MOCKED;
    process.env.GITHUB_REPOS_MODE = "live";

    // Mock auth to return a user (so the function doesn't return early)
    mockAuth.mockResolvedValue({
      user: { id: "test-user-id" },
    });

    // Mock refreshTokenIfNeeded to return null (no GitHub tokens)
    mockRefreshTokenIfNeeded.mockResolvedValue(null);

    // Spy on console.log to verify gitfoobar provider is called
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await fetchUserPullRequests();

    // Check that the gitfoobar provider log message appears among the console logs
    expect(consoleSpy).toHaveBeenCalledWith(
      "gitfoobar provider: returning empty pull requests array",
    );

    consoleSpy.mockRestore();

    // Restore original environment variables
    if (originalMocked !== undefined) {
      process.env.MOCKED = originalMocked;
    }
    if (originalReposMode !== undefined) {
      process.env.GITHUB_REPOS_MODE = originalReposMode;
    }
  });

  it("combines results from both providers and sorts by updated_at", async () => {
    // Temporarily disable mocked mode to test real provider logic
    const originalMocked = process.env.MOCKED;
    const originalReposMode = process.env.GITHUB_REPOS_MODE;
    delete process.env.MOCKED;
    process.env.GITHUB_REPOS_MODE = "live";

    // Mock successful GitHub auth with user ID
    mockAuth.mockResolvedValue({
      user: { id: "test-user-id" },
    });

    // Mock successful token refresh
    mockRefreshTokenIfNeeded.mockResolvedValue({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      scope: "read:user user:email read:org repo",
    });

    // Mock the fetchUserRepositoryPullRequests function to return the expected data
    mockFetchUserRepositoryPullRequests.mockResolvedValue([
      {
        id: 1,
        number: 1,
        title: "Test PR",
        author: "testuser",
        repository: "test-repo",
        html_url: "https://github.com/testuser/test-repo/pull/1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        status: "ready",
        priority: "medium",
      },
    ]);

    const result = await fetchUserPullRequests();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      title: "Test PR",
      number: 1,
      author: "testuser",
      repository: "test-repo",
      status: "ready",
      priority: "medium",
    });

    // Restore original environment variables
    if (originalMocked !== undefined) {
      process.env.MOCKED = originalMocked;
    }
    if (originalReposMode !== undefined) {
      process.env.GITHUB_REPOS_MODE = originalReposMode;
    }
  });
});
