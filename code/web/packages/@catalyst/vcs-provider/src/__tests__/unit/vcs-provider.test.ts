/**
 * VCS Provider Singleton Tests
 *
 * Comprehensive test suite for the VCSProviderSingleton class.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { VCSProviderSingleton } from "../../vcs-provider";
import type { VCSProviderConfig } from "../../vcs-provider";
import type {
  TokenData,
  ProviderId,
  AuthenticatedClient,
  VCSProvider,
} from "../../types";

/**
 * Create a mock VCS provider for testing without real environment dependencies
 */
function createMockProvider(id: ProviderId = "github"): VCSProvider {
  return {
    id,
    name: "Mock Provider",
    iconName: "github",
    authenticate: vi.fn().mockResolvedValue({
      providerId: id,
      raw: {},
    } as AuthenticatedClient),
    validateConfig: vi.fn(),
    checkConnection: vi.fn(),
    listUserRepositories: vi.fn(),
    listUserOrganizations: vi.fn(),
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
    listIssues: vi.fn(),
    listBranches: vi.fn(),
    verifyWebhookSignature: vi.fn(),
    parseWebhookEvent: vi.fn(),
  };
}

/**
 * Helper function to create a basic VCSProviderConfig for testing
 */
function createTestConfig(
  overrides: Partial<VCSProviderConfig> = {},
): VCSProviderConfig {
  return {
    providers: [createMockProvider()],
    getTokenData: vi.fn(),
    refreshToken: vi.fn(),
    storeTokenData: vi.fn(),
    ...overrides,
  };
}

/**
 * Helper function to initialize the singleton with test config
 */
function initializeSingleton(overrides: Partial<VCSProviderConfig> = {}): void {
  VCSProviderSingleton.initialize(createTestConfig(overrides));
}

describe("VCSProviderSingleton", () => {
  // Reset singleton before each test
  beforeEach(() => {
    VCSProviderSingleton.reset();
  });

  describe("Initialization", () => {
    it("should throw error if getInstance is called before initialize", () => {
      expect(() => VCSProviderSingleton.getInstance()).toThrow(
        "VCSProviderSingleton not initialized",
      );
    });

    it("should throw error if initialize is called twice", () => {
      initializeSingleton();

      expect(() => initializeSingleton()).toThrow(
        "VCSProviderSingleton already initialized",
      );
    });

    it("should return same instance on multiple getInstance calls", () => {
      initializeSingleton();

      const instance1 = VCSProviderSingleton.getInstance();
      const instance2 = VCSProviderSingleton.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should check required environment variables", () => {
      // Save original env vars
      const originalEnv = { ...process.env };

      // Remove a required env var
      delete process.env.TEST_REQUIRED_VAR;

      expect(() =>
        initializeSingleton({ requiredEnvVars: ["TEST_REQUIRED_VAR"] }),
      ).toThrow("Missing required environment variables: TEST_REQUIRED_VAR");

      // Restore env
      process.env = originalEnv;
    });

    it("should accept valid environment variables", () => {
      process.env.TEST_REQUIRED_VAR = "test_value";

      expect(() =>
        initializeSingleton({ requiredEnvVars: ["TEST_REQUIRED_VAR"] }),
      ).not.toThrow();

      delete process.env.TEST_REQUIRED_VAR;
    });

    it("should allow re-initialization after reset", () => {
      initializeSingleton();
      VCSProviderSingleton.reset();

      expect(() => initializeSingleton()).not.toThrow();
    });

    it("should throw error when no providers are specified", () => {
      expect(() =>
        VCSProviderSingleton.initialize({
          providers: [],
          getTokenData: vi.fn(),
          refreshToken: vi.fn(),
          storeTokenData: vi.fn(),
        }),
      ).toThrow("At least one provider must be specified");
    });

    it("should call validateConfig on each provider during initialization", () => {
      const mockProvider = createMockProvider();
      const validateConfig = vi.fn();
      mockProvider.validateConfig = validateConfig;

      VCSProviderSingleton.initialize({
        providers: [mockProvider],
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      expect(validateConfig).toHaveBeenCalledTimes(1);
    });

    it("should propagate validation errors from providers", () => {
      const mockProvider = createMockProvider();
      mockProvider.validateConfig = vi.fn().mockImplementation(() => {
        throw new Error("Provider validation failed: missing config");
      });

      expect(() =>
        VCSProviderSingleton.initialize({
          providers: [mockProvider],
          getTokenData: vi.fn(),
          refreshToken: vi.fn(),
          storeTokenData: vi.fn(),
        }),
      ).toThrow("Provider validation failed: missing config");
    });

    it("should register all providers successfully after validation", () => {
      const mockProvider1 = createMockProvider("github");
      const mockProvider2 = createMockProvider("gitlab" as ProviderId);

      VCSProviderSingleton.initialize({
        providers: [mockProvider1, mockProvider2],
        getTokenData: vi.fn(),
        refreshToken: vi.fn(),
        storeTokenData: vi.fn(),
      });

      const vcs = VCSProviderSingleton.getInstance();

      // Both providers should be accessible via getScoped
      expect(() => vcs.getScoped("user-123", "github")).not.toThrow();
      expect(() => vcs.getScoped("user-123", "gitlab")).not.toThrow();
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

      initializeSingleton({ getTokenData, refreshToken, storeTokenData });

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

      initializeSingleton({ getTokenData, refreshToken, storeTokenData });

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

    it("should delegate to provider when managed tokens are not available", async () => {
      const getTokenData = vi.fn().mockResolvedValue(null);

      initializeSingleton({ getTokenData });

      const vcs = VCSProviderSingleton.getInstance();

      // Should now succeed because it delegates to provider
      await expect(
        vcs.getAuthenticatedClient("user-missing", "github"),
      ).resolves.toBeDefined();
    });

    it("should not trigger onAuthError when tokens are simply missing", async () => {
      const onAuthError = vi.fn();
      initializeSingleton({
        getTokenData: vi.fn().mockResolvedValue(null),
        onAuthError,
      });

      const vcs = VCSProviderSingleton.getInstance();

      await vcs.getAuthenticatedClient("user-missing", "github");

      // We only warn, not error, as we are delegating
      expect(onAuthError).not.toHaveBeenCalled();
    });

    it("should trigger onAuthError when refresh fails, but still delegate", async () => {
      const expiredToken: TokenData = {
        accessToken: "expired",
        refreshToken: "refresh",
        expiresAt: new Date(Date.now() - 1000),
      };

      const onAuthError = vi.fn();
      initializeSingleton({
        getTokenData: vi.fn().mockResolvedValue(expiredToken),
        refreshToken: vi.fn().mockRejectedValue(new Error("Refresh failed")),
        onAuthError,
      });

      const vcs = VCSProviderSingleton.getInstance();

      // Should still resolve (delegate) despite refresh failure
      await expect(
        vcs.getAuthenticatedClient("user-refresh-fail", "github"),
      ).resolves.toBeDefined();

      // But onAuthError should have been called during the failed refresh attempt
      expect(onAuthError).toHaveBeenCalledWith("user-refresh-fail", "github");
    });
  });

  describe("Namespaced Operations", () => {
    it("should provide issues namespace", () => {
      initializeSingleton();

      const vcs = VCSProviderSingleton.getInstance();

      expect(vcs.issues).toBeDefined();
      expect(typeof vcs.issues.get).toBe("function");
      expect(typeof vcs.issues.list).toBe("function");
    });

    it("should provide pullRequests namespace", () => {
      initializeSingleton();

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
      initializeSingleton();

      const vcs = VCSProviderSingleton.getInstance();

      expect(vcs.repos).toBeDefined();
      expect(typeof vcs.repos.get).toBe("function");
      expect(typeof vcs.repos.listUser).toBe("function");
      expect(typeof vcs.repos.listOrg).toBe("function");
    });

    it("should provide branches namespace", () => {
      initializeSingleton();

      const vcs = VCSProviderSingleton.getInstance();

      expect(vcs.branches).toBeDefined();
      expect(typeof vcs.branches.list).toBe("function");
      expect(typeof vcs.branches.create).toBe("function");
    });

    it("should provide files namespace", () => {
      initializeSingleton();

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

      const mockListIssues = vi
        .fn()
        .mockResolvedValue([{ number: 1, title: "Test Issue" }]);

      const mockProvider: VCSProvider = {
        id: "github" as ProviderId,
        name: "GitHub",
        iconName: "github",
        authenticate: vi.fn().mockResolvedValue({
          providerId: "github",
          raw: {},
        } as AuthenticatedClient),
        checkConnection: vi.fn(),
        listUserRepositories: vi.fn(),
        listUserOrganizations: vi.fn(),
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
        validateConfig: vi.fn(),
        listIssues: mockListIssues,
        listBranches: vi.fn(),
        verifyWebhookSignature: vi.fn(),
        parseWebhookEvent: vi.fn(),
      };

      initializeSingleton({
        providers: [mockProvider],
        getTokenData: vi.fn().mockResolvedValue(mockTokenData),
      });

      const vcs = VCSProviderSingleton.getInstance();
      const scopedVcs = vcs.getScoped("user-789", "github");

      const issues = await scopedVcs.issues.list("owner", "repo");

      expect(mockListIssues).toHaveBeenCalled();
      expect(issues).toEqual([{ number: 1, title: "Test Issue" }]);
    });
  });

  describe("Default Provider", () => {
    it("should use github as default provider", () => {
      initializeSingleton();

      const vcs = VCSProviderSingleton.getInstance();
      const scoped = vcs.getScoped("user-123");

      // Should use github as default when not specified
      expect(scoped).toBeDefined();
    });

    it("should allow custom default provider", () => {
      initializeSingleton({ defaultProvider: "github" });

      const vcs = VCSProviderSingleton.getInstance();

      expect(vcs).toBeDefined();
    });
  });

  describe("API Methods Signature", () => {
    it("should accept tokenSourceId in issues.get", async () => {
      const mockTokenData: TokenData = {
        accessToken: "test-token",
        refreshToken: "refresh",
        expiresAt: new Date(Date.now() + 3600000),
      };

      initializeSingleton({
        getTokenData: vi.fn().mockResolvedValue(mockTokenData),
      });

      const vcs = VCSProviderSingleton.getInstance();

      try {
        // Should accept tokenSourceId as first parameter
        await vcs.issues.get("team-456", "github", "owner", "repo", 1);
      } catch (_error) {
        // Expected to fail in test, but signature should be correct
      }
    });
  });

  describe("Concurrent Refresh Protection", () => {
    it("should not trigger multiple refresh calls for same token source", async () => {
      const expiredTokens: TokenData = {
        accessToken: "expired",
        refreshToken: "refresh",
        expiresAt: new Date(Date.now() - 1000),
      };

      const newTokens: TokenData = {
        accessToken: "new",
        refreshToken: "new-refresh",
        expiresAt: new Date(Date.now() + 3600000),
      };

      const refreshToken = vi.fn().mockResolvedValue(newTokens);

      initializeSingleton({
        getTokenData: vi.fn().mockResolvedValue(expiredTokens),
        refreshToken,
      });

      const vcs = VCSProviderSingleton.getInstance();

      // Make multiple concurrent requests
      const promises = [
        vcs.getAuthenticatedClient("team-123", "github").catch(() => {}),
        vcs.getAuthenticatedClient("team-123", "github").catch(() => {}),
        vcs.getAuthenticatedClient("team-123", "github").catch(() => {}),
      ];

      await Promise.all(promises);

      // Should only refresh once despite multiple concurrent requests
      expect(refreshToken).toHaveBeenCalledTimes(1);
    });
  });
});
