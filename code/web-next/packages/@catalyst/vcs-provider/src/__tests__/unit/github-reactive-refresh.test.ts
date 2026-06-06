import { describe, it, expect, vi, beforeEach } from "vitest";
import { Octokit } from "@octokit/rest";

// Mock Octokit class and its methods
const mockRequest = vi.fn();
const mockHookError = vi.fn();

vi.mock("@octokit/rest", () => {
  return {
    Octokit: vi.fn(function () {
      return {
        hook: {
          error: mockHookError,
        },
        request: mockRequest,
      };
    }),
  };
});

describe("getUserOctokit Reactive Refresh", () => {
  const userId = "test-user";
  const mockTokenGetter = vi.fn();

  // Variables for dynamically imported functions
  let getUserOctokit: (userId: string) => Promise<Octokit>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let registerTokenGetter: (getter: any) => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Stub environment variables to ensure PAT fallback is disabled
    vi.stubEnv("GITHUB_PAT", "");
    vi.stubEnv("GITHUB_TOKEN", "");
    vi.stubEnv("GITHUB_APP_ID", "test-app-id");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "test-key");
    vi.stubEnv("GITHUB_APP_CLIENT_ID", "test-client-id");
    vi.stubEnv("GITHUB_APP_CLIENT_SECRET", "test-client-secret");
    vi.stubEnv("GITHUB_WEBHOOK_SECRET", "test-secret");
    vi.stubEnv("GITHUB_DISABLE_APP_CHECKS", "true"); // Skip validation

    // Re-import module to pick up new env vars
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientModule = (await import("../../providers/github/client")) as any;
    getUserOctokit = clientModule.getUserOctokit;
    registerTokenGetter = clientModule.registerTokenGetter;

    registerTokenGetter(mockTokenGetter);
  });

  it("should register an error hook on the Octokit instance", async () => {
    mockTokenGetter.mockResolvedValue({ accessToken: "initial-token" });

    await getUserOctokit(userId);

    expect(mockHookError).toHaveBeenCalledWith("request", expect.any(Function));
  });

  it("should intercept 401 errors and retry with refreshed token", async () => {
    mockTokenGetter.mockResolvedValue({ accessToken: "initial-token" });

    await getUserOctokit(userId);

    // Get the registered error hook
    const errorHook = mockHookError.mock.calls[0][1];

    // Simulate 401 error
    const error = { status: 401 };
    const options = {
      method: "GET",
      url: "/user",
      headers: { authorization: "token initial-token" },
      request: { retryCount: 0 },
    };

    // Mock token refresh
    mockTokenGetter.mockResolvedValueOnce({ accessToken: "refreshed-token" });

    // Call the hook
    await errorHook(error, options);

    // Verify token refresh was attempted with forceRefresh: true
    expect(mockTokenGetter).toHaveBeenCalledWith(userId, {
      forceRefresh: true,
    });

    // Verify request was retried with new token
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "token refreshed-token",
        }),
        request: expect.objectContaining({
          retryCount: 1,
        }),
      }),
    );
  });

  it("should not retry if retryCount is already set (prevent infinite loop)", async () => {
    mockTokenGetter.mockResolvedValue({ accessToken: "initial-token" });
    await getUserOctokit(userId);
    const errorHook = mockHookError.mock.calls[0][1];

    const error = { status: 401 };
    const options = {
      method: "GET",
      url: "/user",
      headers: { authorization: "token initial-token" },
      request: { retryCount: 1 }, // Already retried
    };

    await expect(errorHook(error, options)).rejects.toEqual(error);
    expect(mockTokenGetter).toHaveBeenCalledTimes(1); // Only initial call
  });

  it("should throw original error if refresh fails", async () => {
    mockTokenGetter.mockResolvedValue({ accessToken: "initial-token" });
    await getUserOctokit(userId);
    const errorHook = mockHookError.mock.calls[0][1];

    const error = { status: 401 };
    const options = {
      method: "GET",
      url: "/user",
      headers: { authorization: "token initial-token" },
      request: { retryCount: 0 },
    };

    // Mock refresh failure
    mockTokenGetter.mockResolvedValueOnce(null);

    await expect(errorHook(error, options)).rejects.toEqual(error);
  });
});
