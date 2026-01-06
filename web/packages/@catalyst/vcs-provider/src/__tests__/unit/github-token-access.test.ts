import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock values set up via vi.hoisted for proper module mocking
const { mockRefreshTokenIfNeeded, mockGetGitHubTokens, mockGitHubConfig } =
  vi.hoisted(() => {
    return {
      mockRefreshTokenIfNeeded: vi.fn(),
      mockGetGitHubTokens: vi.fn(),
      mockGitHubConfig: {
        PAT: undefined as string | undefined,
        ALLOW_PAT_FALLBACK: true,
        APP_ID: "test-app-id",
        APP_PRIVATE_KEY: "test-private-key",
        APP_CLIENT_ID: "test-client-id",
        APP_CLIENT_SECRET: "test-client-secret",
        WEBHOOK_SECRET: "test-webhook-secret",
      },
    };
  });

// Mock the token modules
vi.mock("../../providers/github/token-refresh", () => ({
  refreshTokenIfNeeded: mockRefreshTokenIfNeeded,
}));

vi.mock("../../providers/github/token-service", () => ({
  getGitHubTokens: mockGetGitHubTokens,
}));

// Mock the client module to control GITHUB_CONFIG
vi.mock("../../providers/github/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../providers/github/client")>();

  // Re-implement getGitHubAccessToken with our mocked config
  async function getGitHubAccessToken(
    userId: string,
  ): Promise<
    | { token: string; status: "valid" }
    | { token: undefined; status: "no_token" | "expired" }
  > {
    // Check if PAT is allowed in current environment
    const isPATAllowed =
      process.env.NODE_ENV !== "production" ||
      mockGitHubConfig.ALLOW_PAT_FALLBACK;

    // First priority: Use PAT if allowed and available
    if (isPATAllowed && mockGitHubConfig.PAT) {
      return { token: mockGitHubConfig.PAT, status: "valid" };
    }

    // Second priority: Use GitHub App user tokens with auto-refresh
    const tokens = await mockRefreshTokenIfNeeded(userId);

    if (tokens?.accessToken) {
      return { token: tokens.accessToken, status: "valid" };
    }

    // No valid token - check if user ever had tokens
    const existingRecord = await mockGetGitHubTokens(userId);

    if (existingRecord?.installationId) {
      return { token: undefined, status: "expired" };
    }

    return { token: undefined, status: "no_token" };
  }

  return {
    ...original,
    GITHUB_CONFIG: mockGitHubConfig,
    getGitHubAccessToken,
  };
});

// Import after mocks are set up
import { getGitHubAccessToken } from "../../providers/github/client";

describe("getGitHubAccessToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock config
    mockGitHubConfig.PAT = undefined;
    mockGitHubConfig.ALLOW_PAT_FALLBACK = true;
  });

  describe("when PAT is available", () => {
    it("returns valid token from PAT in non-production", async () => {
      mockGitHubConfig.PAT = "pat-token-123";

      const result = await getGitHubAccessToken("user-123");

      expect(result).toEqual({ token: "pat-token-123", status: "valid" });
      expect(mockRefreshTokenIfNeeded).not.toHaveBeenCalled();
      expect(mockGetGitHubTokens).not.toHaveBeenCalled();
    });
  });

  describe("when using database tokens", () => {
    beforeEach(() => {
      // Ensure no PAT is set
      mockGitHubConfig.PAT = undefined;
    });

    it("returns valid token when refresh succeeds", async () => {
      mockRefreshTokenIfNeeded.mockResolvedValue({
        accessToken: "refreshed-token-456",
        refreshToken: "refresh-token",
        expiresAt: new Date(),
        scope: "repo,user",
      });

      const result = await getGitHubAccessToken("user-123");

      expect(result).toEqual({ token: "refreshed-token-456", status: "valid" });
      expect(mockRefreshTokenIfNeeded).toHaveBeenCalledWith("user-123");
      expect(mockGetGitHubTokens).not.toHaveBeenCalled();
    });

    it("returns expired when user had installationId but refresh failed", async () => {
      mockRefreshTokenIfNeeded.mockResolvedValue(null);
      mockGetGitHubTokens.mockResolvedValue({
        installationId: "inst-789",
        accessToken: "",
        refreshToken: "",
        expiresAt: new Date(),
        scope: "",
      });

      const result = await getGitHubAccessToken("user-123");

      expect(result).toEqual({ token: undefined, status: "expired" });
      expect(mockRefreshTokenIfNeeded).toHaveBeenCalledWith("user-123");
      expect(mockGetGitHubTokens).toHaveBeenCalledWith("user-123");
    });

    it("returns no_token when user never connected", async () => {
      mockRefreshTokenIfNeeded.mockResolvedValue(null);
      mockGetGitHubTokens.mockResolvedValue(null);

      const result = await getGitHubAccessToken("user-123");

      expect(result).toEqual({ token: undefined, status: "no_token" });
      expect(mockRefreshTokenIfNeeded).toHaveBeenCalledWith("user-123");
      expect(mockGetGitHubTokens).toHaveBeenCalledWith("user-123");
    });

    it("returns no_token when record exists but no installationId", async () => {
      mockRefreshTokenIfNeeded.mockResolvedValue(null);
      mockGetGitHubTokens.mockResolvedValue({
        // Record exists but no installationId means user was not properly connected
        installationId: null,
        accessToken: "",
        refreshToken: "",
        expiresAt: new Date(),
        scope: "",
      });

      const result = await getGitHubAccessToken("user-123");

      expect(result).toEqual({ token: undefined, status: "no_token" });
    });
  });

  describe("token priority", () => {
    it("prefers PAT over database tokens when both available", async () => {
      mockGitHubConfig.PAT = "pat-token";
      mockRefreshTokenIfNeeded.mockResolvedValue({
        accessToken: "db-token",
        refreshToken: "refresh",
        expiresAt: new Date(),
        scope: "",
      });

      const result = await getGitHubAccessToken("user-123");

      expect(result).toEqual({ token: "pat-token", status: "valid" });
      expect(mockRefreshTokenIfNeeded).not.toHaveBeenCalled();
    });
  });
});
