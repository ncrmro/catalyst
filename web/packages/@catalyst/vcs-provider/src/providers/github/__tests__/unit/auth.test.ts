import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  exchangeAuthorizationCode,
  fetchGitHubUser,
  type GitHubUserProfile,
} from "../../auth";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock GITHUB_CONFIG
vi.mock("../../client", () => ({
  GITHUB_CONFIG: {
    APP_CLIENT_ID: "test-client-id",
    APP_CLIENT_SECRET: "test-client-secret",
    PAT: "test-pat",
    ALLOW_PAT_FALLBACK: true,
  },
}));

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("exchangeAuthorizationCode", () => {
    it("should exchange code for tokens", async () => {
      const mockResponse = {
        access_token: "gho_test_access_token",
        refresh_token: "ghr_test_refresh_token",
        scope: "read:user user:email",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await exchangeAuthorizationCode("test-code", "test-state");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "Catalyst-App",
          },
          body: JSON.stringify({
            client_id: "test-client-id",
            client_secret: "test-client-secret",
            code: "test-code",
            state: "test-state",
          }),
        },
      );

      expect(result).toMatchObject({
        accessToken: "gho_test_access_token",
        refreshToken: "ghr_test_refresh_token",
        scope: "read:user user:email",
        installationId: undefined,
      });
      expect(result.expiresAt).toBeInstanceOf(Date);
      // Verify it expires approximately 8 hours from now
      const expectedExpiry = new Date();
      expectedExpiry.setHours(expectedExpiry.getHours() + 8);
      const timeDiff = Math.abs(
        result.expiresAt.getTime() - expectedExpiry.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it("should throw error when GitHub returns error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: "invalid_grant",
          error_description: "The code has expired",
        }),
      });

      await expect(
        exchangeAuthorizationCode("invalid-code"),
      ).rejects.toThrow("GitHub auth error: The code has expired");
    });

    it("should throw error when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      });

      await expect(
        exchangeAuthorizationCode("test-code"),
      ).rejects.toThrow("Failed to exchange authorization code: Bad Request");
    });
  });

  describe("fetchGitHubUser", () => {
    it("should retrieve user with private email (falls back to /user/emails)", async () => {
      const mockUser = {
        id: 12345,
        login: "testuser",
        email: null, // No public email
        name: "Test User",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
      };

      const mockEmails = [
        { email: "test@example.com", primary: true, verified: true },
        { email: "other@example.com", primary: false, verified: true },
      ];

      // First call to /user
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      // Second call to /user/emails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmails,
      });

      const result = await fetchGitHubUser("test-access-token");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, "https://api.github.com/user", {
        headers: {
          Authorization: "Bearer test-access-token",
          Accept: "application/vnd.github+json",
          "User-Agent": "Catalyst-App",
        },
      });
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: "Bearer test-access-token",
            Accept: "application/vnd.github+json",
            "User-Agent": "Catalyst-App",
          },
        },
      );

      expect(result).toEqual({
        id: 12345,
        login: "testuser",
        email: "test@example.com", // Primary email from /user/emails
        name: "Test User",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
      });
    });

    it("should use public email if available", async () => {
      const mockUser = {
        id: 12345,
        login: "testuser",
        email: "public@example.com", // Public email available
        name: "Test User",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const result = await fetchGitHubUser("test-access-token");

      // Should not make a second call to /user/emails
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.email).toBe("public@example.com");
    });

    it("should handle missing email permission (returns null gracefully)", async () => {
      const mockUser = {
        id: 12345,
        login: "testuser",
        email: null,
        name: "Test User",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
      };

      // First call to /user
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      // Second call to /user/emails fails (no permission)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Forbidden",
      });

      const result = await fetchGitHubUser("test-access-token");

      expect(result).toEqual({
        id: 12345,
        login: "testuser",
        email: null, // Email remains null
        name: "Test User",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
      });
    });

    it("should handle no verified emails", async () => {
      const mockUser = {
        id: 12345,
        login: "testuser",
        email: null,
        name: "Test User",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
      };

      const mockEmails = [
        { email: "unverified@example.com", primary: true, verified: false },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmails,
      });

      const result = await fetchGitHubUser("test-access-token");

      expect(result.email).toBeNull();
    });

    it("should throw error when /user request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
      });

      await expect(fetchGitHubUser("invalid-token")).rejects.toThrow(
        "Failed to fetch GitHub user: Unauthorized",
      );
    });
  });
});
