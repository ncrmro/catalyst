/**
 * MockVCSProvider Tests
 *
 * Test suite for the MockVCSProvider implementation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockVCSProvider } from "../../providers/mock/provider";
import type { MockVCSProviderOptions } from "../../providers/mock/provider";
import type { AuthenticatedClient } from "../../types";

describe("MockVCSProvider", () => {
  let provider: MockVCSProvider;
  let mockClient: AuthenticatedClient;

  beforeEach(() => {
    provider = new MockVCSProvider();
    mockClient = {
      providerId: "github",
      raw: { userId: "test-user", mockClient: true },
    };
  });

  describe("Basic Initialization", () => {
    it("should initialize with default options", () => {
      expect(provider.id).toBe("github");
      expect(provider.name).toBe("GitHub (Mock)");
      expect(provider.iconName).toBe("github");
    });

    it("should initialize with custom repositories", () => {
      const customRepos = [
        {
          id: "custom-1",
          name: "custom-repo",
          fullName: "org/custom-repo",
          owner: "org",
          defaultBranch: "main",
          private: false,
          htmlUrl: "https://github.com/org/custom-repo",
          updatedAt: new Date(),
        },
      ];

      const customProvider = new MockVCSProvider({
        repositories: customRepos,
      });

      expect(customProvider).toBeDefined();
    });

    it("should validate config without throwing", () => {
      expect(() => provider.validateConfig()).not.toThrow();
    });
  });

  describe("Authentication", () => {
    it("should authenticate successfully", async () => {
      const client = await provider.authenticate("test-user");
      expect(client).toBeDefined();
      expect(client.providerId).toBe("github");
      expect(client.raw).toBeDefined();
    });

    it("should throw error when configured", async () => {
      const errorProvider = new MockVCSProvider({
        errors: {
          authenticate: new Error("Auth failed"),
        },
      });

      await expect(errorProvider.authenticate("test-user")).rejects.toThrow(
        "Auth failed",
      );
    });

    it("should check connection successfully", async () => {
      const status = await provider.checkConnection("test-user");
      expect(status.connected).toBe(true);
      expect(status.username).toBe("mock-user");
      expect(status.authMethod).toBe("oauth");
    });
  });

  describe("Repository Operations", () => {
    it("should list user repositories", async () => {
      const repos = await provider.listUserRepositories(mockClient);
      expect(repos).toBeInstanceOf(Array);
      expect(repos.length).toBeGreaterThan(0);
      expect(repos[0]).toHaveProperty("id");
      expect(repos[0]).toHaveProperty("name");
      expect(repos[0]).toHaveProperty("fullName");
    });

    it("should list org repositories", async () => {
      const repos = await provider.listOrgRepositories(mockClient, "test-owner");
      expect(repos).toBeInstanceOf(Array);
      expect(repos.every((r) => r.owner === "test-owner")).toBe(true);
    });

    it("should get specific repository", async () => {
      const repo = await provider.getRepository(
        mockClient,
        "test-owner",
        "test-repo",
      );
      expect(repo).toBeDefined();
      expect(repo.owner).toBe("test-owner");
      expect(repo.name).toBe("test-repo");
    });

    it("should throw error for non-existent repository", async () => {
      await expect(
        provider.getRepository(mockClient, "fake", "repo"),
      ).rejects.toThrow("Repository fake/repo not found");
    });

    it("should throw error when configured", async () => {
      const errorProvider = new MockVCSProvider({
        errors: {
          listRepos: new Error("List failed"),
        },
      });

      await expect(
        errorProvider.listUserRepositories(mockClient),
      ).rejects.toThrow("List failed");
    });
  });

  describe("File and Directory Operations", () => {
    it("should get file content", async () => {
      const content = await provider.getFileContent(
        mockClient,
        "test-owner",
        "test-repo",
        "specs/001-test-feature/spec.md",
      );
      expect(content).not.toBeNull();
      expect(content?.content).toContain("# Test Feature");
      expect(content?.sha).toContain("mock-sha");
    });

    it("should return null for non-existent file", async () => {
      const content = await provider.getFileContent(
        mockClient,
        "test-owner",
        "test-repo",
        "non-existent.md",
      );
      expect(content).toBeNull();
    });

    it("should get directory contents", async () => {
      const entries = await provider.getDirectoryContent(
        mockClient,
        "test-owner",
        "test-repo",
        "specs",
      );
      expect(entries).toBeInstanceOf(Array);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0]).toHaveProperty("name");
      expect(entries[0]).toHaveProperty("type");
    });

    it("should return empty array for non-existent directory", async () => {
      const entries = await provider.getDirectoryContent(
        mockClient,
        "test-owner",
        "test-repo",
        "non-existent",
      );
      expect(entries).toEqual([]);
    });

    it("should throw error when configured", async () => {
      const errorProvider = new MockVCSProvider({
        errors: {
          getContent: new Error("Content failed"),
          getDirectory: new Error("Directory failed"),
        },
      });

      await expect(
        errorProvider.getFileContent(
          mockClient,
          "test-owner",
          "test-repo",
          "test.md",
        ),
      ).rejects.toThrow("Content failed");

      await expect(
        errorProvider.getDirectoryContent(
          mockClient,
          "test-owner",
          "test-repo",
          "specs",
        ),
      ).rejects.toThrow("Directory failed");
    });
  });

  describe("Branch Operations", () => {
    it("should create a branch", async () => {
      const branch = await provider.createBranch(
        mockClient,
        "test-owner",
        "test-repo",
        "feature/test",
      );
      expect(branch).toBeDefined();
      expect(branch.name).toBe("feature/test");
      expect(branch.sha).toContain("mock-sha");
    });

    it("should list branches", async () => {
      const branches = await provider.listBranches(
        mockClient,
        "test-owner",
        "test-repo",
      );
      expect(branches).toBeInstanceOf(Array);
      expect(branches.length).toBeGreaterThan(0);
      expect(branches.some((b) => b.name === "main")).toBe(true);
    });
  });

  describe("Pull Request Operations", () => {
    it("should list pull requests", async () => {
      const prs = await provider.listPullRequests(
        mockClient,
        "test-owner",
        "test-repo",
      );
      expect(prs).toBeInstanceOf(Array);
      expect(prs.length).toBeGreaterThan(0);
      expect(prs[0]).toHaveProperty("number");
      expect(prs[0]).toHaveProperty("title");
    });

    it("should get specific pull request", async () => {
      const pr = await provider.getPullRequest(
        mockClient,
        "test-owner",
        "test-repo",
        1,
      );
      expect(pr).toBeDefined();
      expect(pr.number).toBe(1);
    });

    it("should create pull request", async () => {
      const pr = await provider.createPullRequest(
        mockClient,
        "test-owner",
        "test-repo",
        "Test PR",
        "feature/test",
        "main",
        "Test description",
      );
      expect(pr).toBeDefined();
      expect(pr.title).toBe("Test PR");
      expect(pr.sourceBranch).toBe("feature/test");
      expect(pr.targetBranch).toBe("main");
    });

    it("should list PR reviews", async () => {
      const reviews = await provider.listPullRequestReviews(
        mockClient,
        "test-owner",
        "test-repo",
        1,
      );
      expect(reviews).toBeInstanceOf(Array);
    });

    it("should list PR comments", async () => {
      const comments = await provider.listPRComments(
        mockClient,
        "test-owner",
        "test-repo",
        1,
      );
      expect(comments).toBeInstanceOf(Array);
    });

    it("should create PR comment", async () => {
      const comment = await provider.createPRComment(
        mockClient,
        "test-owner",
        "test-repo",
        1,
        "Test comment",
      );
      expect(comment).toBeDefined();
      expect(comment.body).toBe("Test comment");
    });

    it("should update PR comment", async () => {
      const comment = await provider.updatePRComment(
        mockClient,
        "test-owner",
        "test-repo",
        1,
        "Updated comment",
      );
      expect(comment).toBeDefined();
      expect(comment.body).toBe("Updated comment");
    });

    it("should delete PR comment", async () => {
      await expect(
        provider.deletePRComment(mockClient, "test-owner", "test-repo", 1),
      ).resolves.toBeUndefined();
    });
  });

  describe("CI Status", () => {
    it("should get CI status", async () => {
      const status = await provider.getCIStatus(
        mockClient,
        "test-owner",
        "test-repo",
        1,
      );
      expect(status).not.toBeNull();
      expect(status?.overall).toBe("passing");
      expect(status?.checks).toBeInstanceOf(Array);
    });
  });

  describe("Issues", () => {
    it("should list issues", async () => {
      const issues = await provider.listIssues(
        mockClient,
        "test-owner",
        "test-repo",
      );
      expect(issues).toBeInstanceOf(Array);
    });

    it("should filter issues by state", async () => {
      const openIssues = await provider.listIssues(
        mockClient,
        "test-owner",
        "test-repo",
        { state: "open" },
      );
      expect(openIssues.every((i) => i.state === "open")).toBe(true);
    });
  });

  describe("Organizations", () => {
    it("should list user organizations", async () => {
      const orgs = await provider.listUserOrganizations(mockClient);
      expect(orgs).toBeInstanceOf(Array);
      expect(orgs.length).toBeGreaterThan(0);
      expect(orgs[0]).toHaveProperty("login");
      expect(orgs[0]).toHaveProperty("id");
    });
  });

  describe("File Updates", () => {
    it("should update file", async () => {
      const updated = await provider.updateFile(
        mockClient,
        "test-owner",
        "test-repo",
        "test.md",
        "New content",
        "Update test file",
        "main",
      );
      expect(updated).toBeDefined();
      expect(updated.content).toBe("New content");
      expect(updated.sha).toContain("updated");
    });
  });

  describe("Webhooks", () => {
    it("should verify webhook signature", () => {
      const result = provider.verifyWebhookSignature(
        "payload",
        "signature",
        "secret",
      );
      expect(result).toBe(true);
    });

    it("should parse webhook event", () => {
      const headers = new Headers();
      const event = provider.parseWebhookEvent(headers, {});
      expect(event).toBeDefined();
      expect(event.type).toBe("push");
    });
  });

  describe("Delay Simulation", () => {
    it("should simulate delay when configured", async () => {
      const delayProvider = new MockVCSProvider({ delay: 100 });
      const start = Date.now();
      await delayProvider.authenticate("test-user");
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it("should not delay by default", async () => {
      const start = Date.now();
      await provider.authenticate("test-user");
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe("Custom Mock Data", () => {
    it("should use custom repositories", async () => {
      const customRepos = [
        {
          id: "999",
          name: "my-custom-repo",
          fullName: "custom/my-custom-repo",
          owner: "custom",
          defaultBranch: "develop",
          private: true,
          htmlUrl: "https://github.com/custom/my-custom-repo",
          updatedAt: new Date(),
        },
      ];

      const customProvider = new MockVCSProvider({
        repositories: customRepos,
      });

      const repos = await customProvider.listUserRepositories(mockClient);
      expect(repos).toEqual(customRepos);
    });

    it("should use custom directories", async () => {
      const customDirs = {
        docs: [
          {
            type: "file" as const,
            name: "README.md",
            path: "docs/README.md",
            sha: "custom-sha",
            htmlUrl: "https://github.com/test/test/blob/main/docs/README.md",
          },
        ],
      };

      const customProvider = new MockVCSProvider({
        directories: customDirs,
      });

      const entries = await customProvider.getDirectoryContent(
        mockClient,
        "test",
        "test",
        "docs",
      );
      expect(entries).toEqual(customDirs.docs);
    });

    it("should use custom files", async () => {
      const customFiles = {
        "README.md": "# Custom README\nThis is custom content",
      };

      const customProvider = new MockVCSProvider({
        files: customFiles,
      });

      const content = await customProvider.getFileContent(
        mockClient,
        "test",
        "test",
        "README.md",
      );
      expect(content?.content).toBe("# Custom README\nThis is custom content");
    });
  });
});
