import { getGitHubAppInstallations } from "../../../src/actions/github-app";
import { getAllInstallations } from "../../../src/lib/vcs-providers";
import { vi } from "vitest";

// Mock the vcs-providers lib
vi.mock("../../../src/lib/vcs-providers", () => ({
  getAllInstallations: vi.fn(),
}));

const mockGetAllInstallations = getAllInstallations as ReturnType<typeof vi.fn>;

// Mock console.error to avoid noise in test output
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  mockGetAllInstallations.mockReset();
  consoleErrorSpy.mockClear();
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe("getGitHubAppInstallations", () => {
  test("should return filtered installations when getAllInstallations succeeds", async () => {
    const mockInstallations = [
      {
        id: 1,
        account: {
          login: "test-org",
          id: 123,
          type: "Organization",
        },
        app_id: 456,
        target_type: "Organization",
      },
      {
        id: 2,
        account: null, // This should be filtered out
        app_id: 456,
        target_type: "Organization",
      },
      {
        id: 3,
        account: {
          login: "test-user",
          id: 789,
          type: "User",
        },
        app_id: 456,
        target_type: "User",
      },
    ];

    mockGetAllInstallations.mockResolvedValue(mockInstallations as any);

    const result = await getGitHubAppInstallations();

    expect(mockGetAllInstallations).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result[0].account?.login).toBe("test-org");
    expect(result[1].account?.login).toBe("test-user");
    // Ensure the installation with null account is filtered out
    expect(result.some((installation) => installation.account === null)).toBe(
      false,
    );
  });

  test("should return empty array and log error when getAllInstallations throws", async () => {
    const error = new Error("GitHub App credentials are not configured");
    mockGetAllInstallations.mockRejectedValue(error);

    const result = await getGitHubAppInstallations();

    expect(mockGetAllInstallations).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching installations:",
      error,
    );
  });

  test("should return empty array when getAllInstallations returns empty array", async () => {
    mockGetAllInstallations.mockResolvedValue([]);

    const result = await getGitHubAppInstallations();

    expect(mockGetAllInstallations).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  test("should filter out all installations when all have null accounts", async () => {
    const mockInstallations = [
      {
        id: 1,
        account: null,
        app_id: 456,
        target_type: "Organization",
      },
      {
        id: 2,
        account: null,
        app_id: 456,
        target_type: "User",
      },
    ];

    mockGetAllInstallations.mockResolvedValue(mockInstallations as any);

    const result = await getGitHubAppInstallations();

    expect(mockGetAllInstallations).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });
});
