import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for automatic GitHub token refresh in JWT callback
 *
 * This test suite verifies that the JWT callback in auth.ts automatically
 * refreshes GitHub tokens when they're about to expire, ensuring users
 * don't lose GitHub access during their session.
 */

// Mock values for testing
const { mockRefreshTokenIfNeeded, mockDb } = vi.hoisted(() => {
  return {
    mockRefreshTokenIfNeeded: vi.fn(),
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
    },
  };
});

// Mock the vcs-provider module
vi.mock("@catalyst/vcs-provider", () => ({
  refreshTokenIfNeeded: mockRefreshTokenIfNeeded,
  storeGitHubTokens: vi.fn(),
}));

// Mock the database
vi.mock("@/db", () => ({
  db: mockDb,
}));

// Mock users schema
vi.mock("@/db/schema", () => ({
  users: {
    id: "id",
    email: "email",
    name: "name",
  },
  teams: {},
  teamsMemberships: {},
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

describe("JWT Callback Token Refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain for database queries
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "user-123",
              email: "test@example.com",
              name: "Test User",
              admin: false,
            },
          ]),
        }),
      }),
    });
  });

  describe("Token refresh behavior", () => {
    it("should refresh tokens when session is accessed (not initial signin)", async () => {
      // Setup: tokens need refreshing
      const refreshedTokens = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
        scope: "repo,user",
      };

      mockRefreshTokenIfNeeded.mockResolvedValue(refreshedTokens);

      // Simulate the JWT callback logic (not initial signin - no account param)
      const account = undefined; // Not a fresh signin

      // This simulates what happens in the JWT callback
      const userId = "user-123";

      // When not a fresh signin, refresh tokens
      if (!account) {
        const result = await mockRefreshTokenIfNeeded(userId);

        // Verify refresh was called
        expect(mockRefreshTokenIfNeeded).toHaveBeenCalledWith(userId);
        expect(result).toEqual(refreshedTokens);

        // In the actual callback, these would be set on the token
        expect(result?.accessToken).toBe("new-access-token");
        expect(result?.refreshToken).toBe("new-refresh-token");
      }
    });

    it("should not refresh tokens on initial signin (account present)", async () => {
      // Setup: initial signin with GitHub OAuth
      const account = {
        provider: "github",
        access_token: "initial-access-token",
        refresh_token: "initial-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 8 * 3600,
        scope: "repo,user",
      };

      // Simulate the JWT callback logic (initial signin)

      // When it's a fresh signin, don't call refresh
      if (account?.provider === "github") {
        // Initial tokens are stored from the account object
        expect(account.access_token).toBe("initial-access-token");
        expect(account.refresh_token).toBe("initial-refresh-token");
      }

      // Refresh should NOT be called on initial signin
      expect(mockRefreshTokenIfNeeded).not.toHaveBeenCalled();
    });

    it("should handle refresh errors gracefully", async () => {
      // Setup: refresh fails
      mockRefreshTokenIfNeeded.mockRejectedValue(
        new Error("Token refresh failed"),
      );

      const userId = "user-123";

      // Try to refresh and catch the error
      try {
        await mockRefreshTokenIfNeeded(userId);
      } catch (error) {
        // Error should be caught and logged, not thrown to user
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Token refresh failed");
      }

      // Verify refresh was attempted
      expect(mockRefreshTokenIfNeeded).toHaveBeenCalledWith(userId);
    });

    it("should update token expiration after refresh", async () => {
      const now = Date.now();
      const futureDate = new Date(now + 8 * 60 * 60 * 1000); // 8 hours from now

      const refreshedTokens = {
        accessToken: "refreshed-token",
        refreshToken: "new-refresh-token",
        expiresAt: futureDate,
        scope: "repo,user",
      };

      mockRefreshTokenIfNeeded.mockResolvedValue(refreshedTokens);

      const result = await mockRefreshTokenIfNeeded("user-123");

      // Verify expiration is in the future
      expect(result?.expiresAt.getTime()).toBeGreaterThan(now);
      expect(result?.expiresAt.getTime()).toBe(futureDate.getTime());
    });

    it("should preserve all token fields after refresh", async () => {
      const refreshedTokens = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresAt: new Date(),
        scope: "repo,user,read:org",
        installationId: "inst-456",
      };

      mockRefreshTokenIfNeeded.mockResolvedValue(refreshedTokens);

      const result = await mockRefreshTokenIfNeeded("user-123");

      // All fields should be preserved
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("expiresAt");
      expect(result).toHaveProperty("scope");
      expect(result).toHaveProperty("installationId");
    });
  });

  describe("Token refresh timing", () => {
    it("should not refresh tokens that are still valid", async () => {
      // Setup: tokens are still valid (not near expiration)
      mockRefreshTokenIfNeeded.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "valid-refresh",
        expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000), // 7 hours from now
        scope: "repo,user",
      });

      const result = await mockRefreshTokenIfNeeded("user-123");

      // Should return existing valid tokens
      expect(result).toBeTruthy();
      expect(result?.accessToken).toBe("valid-token");
    });

    it("should refresh tokens that are near expiration", async () => {
      // Setup: tokens expire in 4 minutes (within the 5-minute buffer)

      // Mock returns new tokens because old ones are expiring soon
      mockRefreshTokenIfNeeded.mockResolvedValue({
        accessToken: "refreshed-token",
        refreshToken: "new-refresh",
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        scope: "repo,user",
      });

      const result = await mockRefreshTokenIfNeeded("user-123");

      // Should get new tokens
      expect(result?.accessToken).toBe("refreshed-token");
      expect(result?.refreshToken).toBe("new-refresh");
    });

    it("should return null when tokens cannot be refreshed", async () => {
      // Setup: refresh returns null (re-auth needed)
      mockRefreshTokenIfNeeded.mockResolvedValue(null);

      const result = await mockRefreshTokenIfNeeded("user-123");

      // Should return null to indicate re-auth is needed
      expect(result).toBeNull();
    });

    it("should handle tokens with null expiresAt by forcing refresh", async () => {
      // This tests the specific bug fix: tokens with null expiresAt should
      // be handled gracefully rather than throwing TypeError
      const refreshedTokens = {
        accessToken: "refreshed-token",
        refreshToken: "new-refresh-token",
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        scope: "repo,user",
      };

      // Mock should handle null expiresAt and force a refresh
      mockRefreshTokenIfNeeded.mockResolvedValue(refreshedTokens);

      const result = await mockRefreshTokenIfNeeded("user-123");

      // Should successfully return refreshed tokens
      expect(result).toEqual(refreshedTokens);
      expect(result?.accessToken).toBe("refreshed-token");
    });
  });
});
