/**
 * VCS Provider Singleton Tests
 *
 * Comprehensive test suite for the VCSProviderSingleton class.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { VCSProviderSingleton } from "../../vcs-provider";
import type { VCSProviderConfig } from "../../vcs-provider";
import type { TokenData, ProviderId, AuthenticatedClient, VCSProvider } from "../../types";
import { providerRegistry } from "../../provider-registry";
import { GitHubProvider } from "../../providers/github/provider";

describe("VCSProviderSingleton", () => {
  // Register GitHub provider before tests
  beforeEach(() => {
    VCSProviderSingleton.reset();
    providerRegistry.register(new GitHubProvider());
  });

  describe("Initialization", () => {
    it("should throw error if getInstance is called before initialize", () => {
      expect(() => VCSProviderSingleton.getInstance()).toThrow(
        "VCSProviderSingleton not initialized",
      );
    });

    it("should throw error if initialize is called twice", () => {
      const config: VCSProviderConfig = {
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      };

      VCSProviderSingleton.initialize(config);

      expect(() => VCSProviderSingleton.initialize(config)).toThrow(
        "VCSProviderSingleton already initialized",
      );
    });

    it("should return same instance on multiple getInstance calls", () => {
      const config: VCSProviderConfig = {
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      };

      VCSProviderSingleton.initialize(config);

      const instance1 = VCSProviderSingleton.getInstance();
      const instance2 = VCSProviderSingleton.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should check required environment variables", () => {
      // Save original env vars
      const originalEnv = { ...process.env };

      // Remove a required env var
      delete process.env.TEST_REQUIRED_VAR;

      const config: VCSProviderConfig = {
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
        requiredEnvVars: ["TEST_REQUIRED_VAR"],
      };

      expect(() => VCSProviderSingleton.initialize(config)).toThrow(
        "Missing required environment variables: TEST_REQUIRED_VAR",
      );

      // Restore env
      process.env = originalEnv;
    });

    it("should accept valid environment variables", () => {
      process.env.TEST_REQUIRED_VAR = "test_value";

      const config: VCSProviderConfig = {
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
        requiredEnvVars: ["TEST_REQUIRED_VAR"],
      };

      expect(() => VCSProviderSingleton.initialize(config)).not.toThrow();

      delete process.env.TEST_REQUIRED_VAR;
    });

    it("should allow re-initialization after reset", () => {
      const config: VCSProviderConfig = {
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      };

      VCSProviderSingleton.initialize(config);
      VCSProviderSingleton.reset();

      expect(() => VCSProviderSingleton.initialize(config)).not.toThrow();
    });
  });

  describe("Token Management", () => {
    it("should use tokenSourceId instead of userId", async () => {
      const validTokens: TokenData = {
        accessToken: "valid_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(validTokens);
      const refreshToken = vi.fn();
      const storeTokenData = vi.fn();

      VCSProviderSingleton.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const vcs = VCSProviderSingleton.getInstance();

      // Try to get authenticated client with a team ID
      try {
        await vcs.getAuthenticatedClient("team-123", "github");
      } catch (_error) {
        // Expected to fail since we don't have a real provider client
        // but we can check that getTokenData was called with correct params
      }

      expect(getTokenData).toHaveBeenCalledWith("team-123", "github");
    });

    it("should refresh tokens automatically when expired", async () => {
      const expiredTokens: TokenData = {
        accessToken: "expired_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(Date.now() - 1000),
        scope: "repo",
      };

      const newTokens: TokenData = {
        accessToken: "new_token",
        refreshToken: "new_refresh_token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(expiredTokens);
      const refreshToken = vi.fn().mockResolvedValue(newTokens);
      const storeTokenData = vi.fn();

      VCSProviderSingleton.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const vcs = VCSProviderSingleton.getInstance();

      try {
        await vcs.getAuthenticatedClient("project-456", "github");
      } catch (_error) {
        // Expected to fail, but refresh should have been called
      }

      expect(refreshToken).toHaveBeenCalledWith("refresh_token", "github");
      expect(storeTokenData).toHaveBeenCalledWith(
        "project-456",
        newTokens,
        "github",
      );
    });

    it("should throw error when tokens are not available", async () => {
      const getTokenData = vi.fn().mockResolvedValue(null);

      VCSProviderSingleton.initialize({
        getTokenData,
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();

      await expect(
        vcs.getAuthenticatedClient("user-789", "github"),
      ).rejects.toThrow("No valid tokens available");
    });

    it("should trigger onAuthError when tokens are missing", async () => {
      const onAuthError = vi.fn();
      VCSProviderSingleton.initialize({
        getTokenData: vi.fn().mockResolvedValue(null),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
        onAuthError,
      });

      const vcs = VCSProviderSingleton.getInstance();

      await expect(
        vcs.getAuthenticatedClient("user-missing", "github"),
      ).rejects.toThrow(/No valid tokens available/);

      expect(onAuthError).toHaveBeenCalledWith("user-missing", "github");
    });

    it("should trigger onAuthError when refresh fails", async () => {
      const expiredToken: TokenData = {
        accessToken: "expired",
        refreshToken: "refresh",
        expiresAt: new Date(Date.now() - 1000),
      };

      const onAuthError = vi.fn();
      VCSProviderSingleton.initialize({
        getTokenData: vi.fn().mockResolvedValue(expiredToken),
        refreshToken: vi.fn().mockRejectedValue(new Error("Refresh failed")),
        storeTokenData: vi.fn(),
        onAuthError,
      });

      const vcs = VCSProviderSingleton.getInstance();

      await expect(
        vcs.getAuthenticatedClient("user-refresh-fail", "github"),
      ).rejects.toThrow(/No valid tokens available/);

      expect(onAuthError).toHaveBeenCalledWith("user-refresh-fail", "github");
    });
  });

  describe("Namespaced Operations", () => {
    it("should provide issues namespace", () => {
      VCSProviderSingleton.initialize({
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();

      expect(vcs.issues).toBeDefined();
      expect(typeof vcs.issues.get).toBe("function");
      expect(typeof vcs.issues.list).toBe("function");
    });

    it("should provide pullRequests namespace", () => {
      VCSProviderSingleton.initialize({
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();

      expect(vcs.pullRequests).toBeDefined();
      expect(typeof vcs.pullRequests.get).toBe("function");
      expect(typeof vcs.pullRequests.list).toBe("function");
      expect(typeof vcs.pullRequests.create).toBe("function");
      expect(typeof vcs.pullRequests.listReviews).toBe("function");
      expect(typeof vcs.pullRequests.listComments).toBe("function");
      expect(typeof vcs.pullRequests.createComment).toBe("function");
      expect(typeof vcs.pullRequests.getCIStatus).toBe("function");
    });

    it("should provide repos namespace", () => {
      VCSProviderSingleton.initialize({
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();

      expect(vcs.repos).toBeDefined();
      expect(typeof vcs.repos.get).toBe("function");
      expect(typeof vcs.repos.listUser).toBe("function");
      expect(typeof vcs.repos.listOrg).toBe("function");
    });

    it("should provide branches namespace", () => {
      VCSProviderSingleton.initialize({
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();

      expect(vcs.branches).toBeDefined();
      expect(typeof vcs.branches.list).toBe("function");
      expect(typeof vcs.branches.create).toBe("function");
    });

    it("should provide files namespace", () => {
      VCSProviderSingleton.initialize({
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();

      expect(vcs.files).toBeDefined();
      expect(typeof vcs.files.getContent).toBe("function");
      expect(typeof vcs.files.getDirectory).toBe("function");
      expect(typeof vcs.files.update).toBe("function");
    });
  });

  describe("Scoped Provider", () => {
    it("should provide a scoped instance with bound IDs", async () => {
      const mockTokenData: TokenData = {
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
        scope: "repo",
      };
      
      const mockListIssues = vi.fn().mockResolvedValue([{ number: 1, title: "Test Issue" }]);
      
      const mockProvider: VCSProvider = {
        id: "github" as ProviderId,
        name: "GitHub",
        iconName: "github",
        authenticate: vi.fn().mockResolvedValue({ providerId: "github", raw: {} } as AuthenticatedClient),
        checkConnection: vi.fn(),
        storeTokens: vi.fn(),
        refreshTokensIfNeeded: vi.fn(),
        listUserRepositories: vi.fn(),
        listOrgRepositories: vi.fn(),
        getRepository: vi.fn(),
        getFileContent: vi.fn(),
        getDirectoryContent: vi.fn(),
        createBranch: vi.fn(),
        updateFile: vi.fn(),
        listPullRequests: vi.fn(),
        getPullRequest: vi.fn(),
        createPullRequest: vi.fn(),
        listPullRequestReviews: vi.fn(),
        listPRComments: vi.fn(),
        createPRComment: vi.fn(),
        updatePRComment: vi.fn(),
        deletePRComment: vi.fn(),
        getCIStatus: vi.fn(),
        listIssues: mockListIssues,
        listBranches: vi.fn(),
        verifyWebhookSignature: vi.fn(),
        parseWebhookEvent: vi.fn(),
      };

      // Mock the registry to return our mock provider
      vi.spyOn(providerRegistry, 'get').mockReturnValue(mockProvider);

      VCSProviderSingleton.initialize({
        getTokenData: vi.fn().mockResolvedValue(mockTokenData),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();
      const scoped = vcs.getScoped("user-scoped", "github");

      // Test a method call through scoped instance
      const issue = await scoped.issues.get("owner", "repo", 1);
      
      expect(issue.number).toBe(1);
      expect(mockListIssues).toHaveBeenCalled();
    });
  });

  describe("Default Provider", () => {
    it("should use github as default provider", async () => {
      VCSProviderSingleton.initialize({
        getTokenData: vi.fn().mockResolvedValue(null),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();

      // Should use github by default when providerId is not specified
      await expect(
        vcs.getAuthenticatedClient("user-123"),
      ).rejects.toThrow(/github/);
    });

    it("should allow custom default provider", async () => {
      VCSProviderSingleton.initialize({
        getTokenData: vi.fn().mockResolvedValue(null),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
        defaultProvider: "gitlab" as ProviderId,
      });

      const vcs = VCSProviderSingleton.getInstance();

      // Should use gitlab when not specified
      await expect(
        vcs.getAuthenticatedClient("user-123"),
      ).rejects.toThrow(/gitlab/);
    });
  });

  describe("API Methods Signature", () => {
    it("should accept tokenSourceId in issues.get", async () => {
      const validTokens: TokenData = {
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      VCSProviderSingleton.initialize({
        getTokenData: vi.fn().mockResolvedValue(validTokens),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();

      // This should accept various token source types
      const testCases = [
        "user-123",
        "team-456",
        "project-789",
        "org-abc",
      ];

      for (const tokenSourceId of testCases) {
        try {
          // This will fail because we don't have real provider setup
          // but it should accept the tokenSourceId parameter
          // Now providerId is required as the second parameter
          await vcs.issues.get(tokenSourceId, "github", "owner", "repo", 1);
        } catch (_error) {
          // Expected to fail, just checking parameter acceptance
        }
      }
    });
  });

  describe("Concurrent Refresh Protection", () => {
    it("should not trigger multiple refresh calls for same token source", async () => {
      const expiredTokens: TokenData = {
        accessToken: "expired",
        refreshToken: "refresh",
        expiresAt: new Date(Date.now() - 1000),
        scope: "repo",
      };

      const newTokens: TokenData = {
        accessToken: "new",
        refreshToken: "new_refresh",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scope: "repo",
      };

      const getTokenData = vi.fn().mockResolvedValue(expiredTokens);
      const refreshToken = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(newTokens), 100);
          }),
      );
      const storeTokenData = vi.fn();

      VCSProviderSingleton.initialize({
        getTokenData,
        refreshToken,
        storeTokenData,
      });

      const vcs = VCSProviderSingleton.getInstance();

      // Make 3 concurrent calls with same token source
      const promises = [
        vcs.getAuthenticatedClient("team-123", "github").catch(() => null),
        vcs.getAuthenticatedClient("team-123", "github").catch(() => null),
        vcs.getAuthenticatedClient("team-123", "github").catch(() => null),
      ];

      await Promise.all(promises);

      // Refresh should only be called once
      expect(refreshToken).toHaveBeenCalledTimes(1);
      expect(storeTokenData).toHaveBeenCalledTimes(1);
    });
  });
});