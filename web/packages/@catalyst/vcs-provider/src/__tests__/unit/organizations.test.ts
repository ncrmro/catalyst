import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubProvider } from "../../providers/github/provider";
import type { AuthenticatedClient } from "../../types";

// Mock Octokit
const {
  mockGetOrg,
  mockListMembers,
  mockGetMembershipForUser,
  mockGetMembershipForAuthenticatedUser,
  mockOctokit,
} = vi.hoisted(() => {
  const mockGetOrg = vi.fn();
  const mockListMembers = vi.fn();
  const mockGetMembershipForUser = vi.fn();
  const mockGetMembershipForAuthenticatedUser = vi.fn();

  const mockOctokit = {
    rest: {
      orgs: {
        get: mockGetOrg,
        listMembers: mockListMembers,
        getMembershipForUser: mockGetMembershipForUser,
        getMembershipForAuthenticatedUser:
          mockGetMembershipForAuthenticatedUser,
      },
    },
  };

  return {
    mockGetOrg,
    mockListMembers,
    mockGetMembershipForUser,
    mockGetMembershipForAuthenticatedUser,
    mockOctokit,
  };
});

// Mock dependencies
vi.mock("../../providers/github/client", () => ({
  getUserOctokit: vi.fn().mockResolvedValue(mockOctokit),
  GITHUB_CONFIG: {
    PAT: "test-pat",
    ALLOW_PAT_FALLBACK: true,
    DISABLE_APP_CHECKS: true,
  },
}));

vi.mock("../../providers/github/token-service", () => ({
  getGitHubTokens: vi.fn().mockResolvedValue(null),
  storeGitHubTokens: vi.fn(),
}));

vi.mock("../../providers/github/token-refresh", () => ({
  refreshTokenIfNeeded: vi.fn().mockResolvedValue(null),
}));

describe("GitHubProvider - Organization Operations", () => {
  let provider: GitHubProvider;
  let client: AuthenticatedClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    provider = new GitHubProvider();
    client = await provider.authenticate("test-user");
  });

  describe("getOrganization", () => {
    it("should fetch organization details", async () => {
      mockGetOrg.mockResolvedValue({
        data: {
          id: 12345,
          login: "test-org",
          name: "Test Organization",
          description: "A test organization",
          avatar_url: "https://avatars.githubusercontent.com/u/12345",
          html_url: "https://github.com/test-org",
        },
      });

      const result = await provider.getOrganization(client, "test-org");

      expect(mockGetOrg).toHaveBeenCalledWith({ org: "test-org" });
      expect(result).toEqual({
        id: "12345",
        login: "test-org",
        name: "Test Organization",
        description: "A test organization",
        avatarUrl: "https://avatars.githubusercontent.com/u/12345",
        url: "https://github.com/test-org",
        type: "Organization",
        membersCount: undefined,
      });
    });

    it("should handle organization with no name", async () => {
      mockGetOrg.mockResolvedValue({
        data: {
          id: 12345,
          login: "test-org",
          name: null,
          description: null,
          avatar_url: "https://avatars.githubusercontent.com/u/12345",
          html_url: "https://github.com/test-org",
        },
      });

      const result = await provider.getOrganization(client, "test-org");

      expect(result).toEqual({
        id: "12345",
        login: "test-org",
        name: undefined,
        description: undefined,
        avatarUrl: "https://avatars.githubusercontent.com/u/12345",
        url: "https://github.com/test-org",
        type: "Organization",
        membersCount: undefined,
      });
    });
  });

  describe("listOrganizationMembers", () => {
    it("should list organization members with roles", async () => {
      mockListMembers.mockResolvedValue({
        data: [
          {
            id: 1,
            login: "user1",
            avatar_url: "https://avatars.githubusercontent.com/u/1",
          },
          {
            id: 2,
            login: "user2",
            avatar_url: "https://avatars.githubusercontent.com/u/2",
          },
        ],
      });

      mockGetMembershipForUser
        .mockResolvedValueOnce({
          data: {
            role: "admin",
            state: "active",
          },
        })
        .mockResolvedValueOnce({
          data: {
            role: "member",
            state: "active",
          },
        });

      const result = await provider.listOrganizationMembers(client, "test-org");

      expect(mockListMembers).toHaveBeenCalledWith({
        org: "test-org",
        per_page: 100,
      });

      expect(mockGetMembershipForUser).toHaveBeenCalledTimes(2);
      expect(mockGetMembershipForUser).toHaveBeenNthCalledWith(1, {
        org: "test-org",
        username: "user1",
      });
      expect(mockGetMembershipForUser).toHaveBeenNthCalledWith(2, {
        org: "test-org",
        username: "user2",
      });

      expect(result).toEqual([
        {
          id: "1",
          login: "user1",
          avatarUrl: "https://avatars.githubusercontent.com/u/1",
          role: "owner", // GitHub 'admin' maps to 'owner'
          state: "active",
        },
        {
          id: "2",
          login: "user2",
          avatarUrl: "https://avatars.githubusercontent.com/u/2",
          role: "member",
          state: "active",
        },
      ]);
    });

    it("should default to member role if membership details fail", async () => {
      mockListMembers.mockResolvedValue({
        data: [
          {
            id: 1,
            login: "user1",
            avatar_url: "https://avatars.githubusercontent.com/u/1",
          },
        ],
      });

      // Simulate API error when getting membership details
      mockGetMembershipForUser.mockRejectedValue(new Error("API error"));

      const result = await provider.listOrganizationMembers(client, "test-org");

      expect(result).toEqual([
        {
          id: "1",
          login: "user1",
          avatarUrl: "https://avatars.githubusercontent.com/u/1",
          role: "member",
          state: "active",
        },
      ]);
    });
  });

  describe("getMyOrganizationMembership", () => {
    it("should return membership when user is a member", async () => {
      mockGetMembershipForAuthenticatedUser.mockResolvedValue({
        data: {
          role: "admin",
          state: "active",
        },
      });

      const result = await provider.getMyOrganizationMembership(
        client,
        "test-org",
      );

      expect(mockGetMembershipForAuthenticatedUser).toHaveBeenCalledWith({
        org: "test-org",
      });

      expect(result).toEqual({
        isMember: true,
        role: "owner", // GitHub 'admin' maps to 'owner'
        state: "active",
      });
    });

    it("should return non-member when user is not in organization", async () => {
      // Simulate 404 error (not a member)
      mockGetMembershipForAuthenticatedUser.mockRejectedValue(
        new Error("Not Found"),
      );

      const result = await provider.getMyOrganizationMembership(
        client,
        "test-org",
      );

      expect(result).toEqual({
        isMember: false,
      });
    });

    it("should handle pending membership", async () => {
      mockGetMembershipForAuthenticatedUser.mockResolvedValue({
        data: {
          role: "member",
          state: "pending",
        },
      });

      const result = await provider.getMyOrganizationMembership(
        client,
        "test-org",
      );

      expect(result).toEqual({
        isMember: true,
        role: "member",
        state: "pending",
      });
    });
  });

  describe("mapGitHubRoleToOrgRole", () => {
    it("should map admin to owner", async () => {
      mockGetMembershipForAuthenticatedUser.mockResolvedValue({
        data: {
          role: "admin",
          state: "active",
        },
      });

      const result = await provider.getMyOrganizationMembership(
        client,
        "test-org",
      );

      expect(result.role).toBe("owner");
    });

    it("should map member to member", async () => {
      mockGetMembershipForAuthenticatedUser.mockResolvedValue({
        data: {
          role: "member",
          state: "active",
        },
      });

      const result = await provider.getMyOrganizationMembership(
        client,
        "test-org",
      );

      expect(result.role).toBe("member");
    });

    it("should default unknown roles to member", async () => {
      mockGetMembershipForAuthenticatedUser.mockResolvedValue({
        data: {
          role: "unknown-role",
          state: "active",
        },
      });

      const result = await provider.getMyOrganizationMembership(
        client,
        "test-org",
      );

      expect(result.role).toBe("member");
    });
  });
});
