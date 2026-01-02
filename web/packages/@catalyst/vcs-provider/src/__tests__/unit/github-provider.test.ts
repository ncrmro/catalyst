import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubProvider } from "../../providers/github/provider";
import type { AuthenticatedClient } from "../../types";

// Mock Octokit
const {
  mockCreateRef,
  mockGetRef,
  mockGetContent,
  mockCreateOrUpdateFileContents,
  mockOctokit,
} = vi.hoisted(() => {
  const mockCreateRef = vi.fn();
  const mockGetRef = vi.fn();
  const mockGetContent = vi.fn();
  const mockCreateOrUpdateFileContents = vi.fn();

  const mockOctokit = {
    rest: {
      git: {
        createRef: mockCreateRef,
        getRef: mockGetRef,
      },
      repos: {
        getContent: mockGetContent,
        createOrUpdateFileContents: mockCreateOrUpdateFileContents,
      },
    },
  };

  return {
    mockCreateRef,
    mockGetRef,
    mockGetContent,
    mockCreateOrUpdateFileContents,
    mockOctokit,
  };
});

// Mock dependencies
vi.mock("../../providers/github/client", () => ({
  getUserOctokit: vi.fn().mockResolvedValue(mockOctokit),
  GITHUB_CONFIG: {
    PAT: "test-pat",
    ALLOW_PAT_FALLBACK: true,
  },
}));

vi.mock("../../providers/github/token-service", () => ({
  getGitHubTokens: vi.fn().mockResolvedValue(null),
  storeGitHubTokens: vi.fn(),
}));

vi.mock("../../providers/github/token-refresh", () => ({
  refreshTokenIfNeeded: vi.fn().mockResolvedValue(null),
}));

describe("GitHubProvider", () => {
  let provider: GitHubProvider;
  let client: AuthenticatedClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    provider = new GitHubProvider();
    client = await provider.authenticate("test-user");
  });

  describe("createBranch", () => {
    it("should create a branch from main by default", async () => {
      // Mock getRef response (get SHA of main)
      mockGetRef.mockResolvedValue({
        data: {
          object: { sha: "main-sha" },
        },
      });

      // Mock createRef response
      mockCreateRef.mockResolvedValue({
        data: {
          object: { sha: "new-branch-sha" },
        },
      });

      const result = await provider.createBranch(
        client,
        "owner",
        "repo",
        "feature-branch",
      );

      expect(mockGetRef).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        ref: "heads/main",
      });

      expect(mockCreateRef).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        ref: "refs/heads/feature-branch",
        sha: "main-sha",
      });

      expect(result).toEqual({
        name: "feature-branch",
        sha: "new-branch-sha",
      });
    });

    it("should create a branch from a specific base branch", async () => {
      mockGetRef.mockResolvedValue({
        data: {
          object: { sha: "dev-sha" },
        },
      });

      mockCreateRef.mockResolvedValue({
        data: {
          object: { sha: "new-branch-sha" },
        },
      });

      await provider.createBranch(
        client,
        "owner",
        "repo",
        "feature-branch",
        "dev",
      );

      expect(mockGetRef).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        ref: "heads/dev",
      });
    });
  });

  describe("updateFile", () => {
    it("should create a new file if it does not exist", async () => {
      // Mock getContent throwing error (file not found)
      mockGetContent.mockRejectedValue({ status: 404 });

      // Mock createOrUpdateFileContents
      mockCreateOrUpdateFileContents.mockResolvedValue({
        data: {
          content: {
            name: "test.md",
            path: "docs/test.md",
            sha: "new-file-sha",
            html_url: "http://github.com/owner/repo/blob/main/docs/test.md",
          },
        },
      });

      const result = await provider.updateFile(
        client,
        "owner",
        "repo",
        "docs/test.md",
        "# Hello",
        "Create test.md",
        "main",
      );

      expect(mockGetContent).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        path: "docs/test.md",
        ref: "main",
      });

      expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        path: "docs/test.md",
        message: "Create test.md",
        content: Buffer.from("# Hello").toString("base64"),
        branch: "main",
        sha: undefined,
      });

      expect(result).toEqual({
        name: "test.md",
        path: "docs/test.md",
        content: "# Hello",
        sha: "new-file-sha",
        htmlUrl: "http://github.com/owner/repo/blob/main/docs/test.md",
      });
    });

    it("should update an existing file", async () => {
      // Mock getContent success (file exists)
      mockGetContent.mockResolvedValue({
        data: {
          type: "file",
          sha: "existing-sha",
        },
      });

      // Mock createOrUpdateFileContents
      mockCreateOrUpdateFileContents.mockResolvedValue({
        data: {
          content: {
            name: "test.md",
            path: "docs/test.md",
            sha: "updated-sha",
            html_url: "http://github.com/owner/repo/blob/main/docs/test.md",
          },
        },
      });

      await provider.updateFile(
        client,
        "owner",
        "repo",
        "docs/test.md",
        "# Hello Updated",
        "Update test.md",
        "main",
      );

      expect(mockCreateOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: "existing-sha",
          content: Buffer.from("# Hello Updated").toString("base64"),
        }),
      );
    });
  });
});
