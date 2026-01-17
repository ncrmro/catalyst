import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for vcs-providers token refresh functions
 *
 * This test suite verifies that refreshTokenIfNeeded and getGitHubTokens
 * handle edge cases like null expiresAt gracefully.
 */

// Mock database and crypto
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
};

const mockEncrypt = vi.fn((value: string) => ({
  encryptedData: `encrypted-${value}`,
  iv: `iv-${value}`,
  authTag: `auth-${value}`,
}));

const mockDecrypt = vi.fn((encrypted: string, iv: string, authTag: string) => {
  // Extract original value from encrypted format
  return encrypted.replace("encrypted-", "");
});

vi.mock("@/db", () => ({
  db: mockDb,
}));

vi.mock("@/db/schema", () => ({
  githubUserTokens: {
    userId: "user_id",
    installationId: "installation_id",
    accessTokenEncrypted: "access_token_encrypted",
    accessTokenIv: "access_token_iv",
    accessTokenAuthTag: "access_token_auth_tag",
    refreshTokenEncrypted: "refresh_token_encrypted",
    refreshTokenIv: "refresh_token_iv",
    refreshTokenAuthTag: "refresh_token_auth_tag",
    tokenExpiresAt: "token_expires_at",
    tokenScope: "token_scope",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

vi.mock("@tetrastack/backend/utils", () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt,
}));

// Mock fetch for exchangeRefreshToken
global.fetch = vi.fn();

describe("vcs-providers token refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGitHubTokens", () => {
    it("should handle null expiresAt gracefully", async () => {
      // Setup: mock database returning tokens with null expiresAt
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                userId: "user-123",
                accessTokenEncrypted: "encrypted-access",
                accessTokenIv: "iv-access",
                accessTokenAuthTag: "auth-access",
                refreshTokenEncrypted: "encrypted-refresh",
                refreshTokenIv: "iv-refresh",
                refreshTokenAuthTag: "auth-refresh",
                tokenExpiresAt: null, // This is the edge case we're testing
                tokenScope: "repo,user",
                installationId: "install-123",
              },
            ]),
          }),
        }),
      });

      const { getGitHubTokens } = await import("@/lib/vcs-providers");
      const tokens = await getGitHubTokens("user-123");

      // Should return tokens with undefined expiresAt instead of failing
      expect(tokens).toBeTruthy();
      expect(tokens?.accessToken).toBe("access");
      expect(tokens?.refreshToken).toBe("refresh");
      expect(tokens?.expiresAt).toBeUndefined();
    });

    it("should return tokens with valid expiresAt", async () => {
      const futureDate = new Date(Date.now() + 8 * 60 * 60 * 1000);

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                userId: "user-123",
                accessTokenEncrypted: "encrypted-access",
                accessTokenIv: "iv-access",
                accessTokenAuthTag: "auth-access",
                refreshTokenEncrypted: "encrypted-refresh",
                refreshTokenIv: "iv-refresh",
                refreshTokenAuthTag: "auth-refresh",
                tokenExpiresAt: futureDate,
                tokenScope: "repo,user",
                installationId: "install-123",
              },
            ]),
          }),
        }),
      });

      const { getGitHubTokens } = await import("@/lib/vcs-providers");
      const tokens = await getGitHubTokens("user-123");

      expect(tokens).toBeTruthy();
      expect(tokens?.expiresAt).toEqual(futureDate);
    });
  });

  describe("refreshTokenIfNeeded", () => {
    it("should force refresh when expiresAt is null", async () => {
      // Setup: getGitHubTokens returns tokens with undefined expiresAt
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                userId: "user-123",
                accessTokenEncrypted: "encrypted-old-access",
                accessTokenIv: "iv-old-access",
                accessTokenAuthTag: "auth-old-access",
                refreshTokenEncrypted: "encrypted-old-refresh",
                refreshTokenIv: "iv-old-refresh",
                refreshTokenAuthTag: "auth-old-refresh",
                tokenExpiresAt: null,
                tokenScope: "repo,user",
                installationId: "install-123",
              },
            ]),
          }),
        }),
      });

      // Mock successful token exchange
      const newExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          scope: "repo,user",
        }),
      });

      // Mock storeGitHubTokens (insert with onConflictDoUpdate)
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const { refreshTokenIfNeeded } = await import("@/lib/vcs-providers");
      const tokens = await refreshTokenIfNeeded("user-123");

      // Should successfully refresh despite null expiresAt
      expect(tokens).toBeTruthy();
      expect(tokens?.accessToken).toBe("new-access-token");
      expect(tokens?.refreshToken).toBe("new-refresh-token");
      expect(fetch).toHaveBeenCalledWith(
        "https://github.com/login/oauth/access_token",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("old-refresh"),
        }),
      );
    });

    it("should not refresh valid tokens", async () => {
      const futureDate = new Date(Date.now() + 8 * 60 * 60 * 1000);

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                userId: "user-123",
                accessTokenEncrypted: "encrypted-valid-access",
                accessTokenIv: "iv-valid-access",
                accessTokenAuthTag: "auth-valid-access",
                refreshTokenEncrypted: "encrypted-valid-refresh",
                refreshTokenIv: "iv-valid-refresh",
                refreshTokenAuthTag: "auth-valid-refresh",
                tokenExpiresAt: futureDate,
                tokenScope: "repo,user",
                installationId: "install-123",
              },
            ]),
          }),
        }),
      });

      const { refreshTokenIfNeeded } = await import("@/lib/vcs-providers");
      const tokens = await refreshTokenIfNeeded("user-123");

      // Should return existing tokens without refreshing
      expect(tokens).toBeTruthy();
      expect(tokens?.accessToken).toBe("valid-access");
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
