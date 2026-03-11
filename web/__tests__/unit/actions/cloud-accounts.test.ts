/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/team-auth", () => ({
  isUserTeamMember: vi.fn(),
}));

vi.mock("@/models/cloud-accounts", () => ({
  getCloudAccounts: vi.fn(),
  createCloudAccount: vi.fn(),
  deleteCloudAccount: vi.fn(),
}));

import { auth } from "@/auth";
import { isUserTeamMember } from "@/lib/team-auth";
import {
  getCloudAccounts,
  createCloudAccount as createCloudAccountModel,
  deleteCloudAccount as deleteCloudAccountModel,
} from "@/models/cloud-accounts";
import {
  listCloudAccounts,
  linkCloudAccount,
  unlinkCloudAccount,
} from "@/actions/cloud-accounts";

const mockAuth = vi.mocked(auth);
const mockIsUserTeamMember = vi.mocked(isUserTeamMember);
const mockGetCloudAccounts = vi.mocked(getCloudAccounts);
const mockCreateCloudAccount = vi.mocked(createCloudAccountModel);
const mockDeleteCloudAccount = vi.mocked(deleteCloudAccountModel);

describe("cloud accounts actions", () => {
  const teamId = "team-123";
  const userId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: userId },
    } as any);
    mockIsUserTeamMember.mockResolvedValue(true);
  });

  describe("listCloudAccounts", () => {
    it("should return account summaries without encrypted fields", async () => {
      mockGetCloudAccounts.mockResolvedValue([
        {
          id: "acc-1",
          teamId,
          provider: "aws",
          name: "My AWS",
          status: "active",
          externalAccountId: "123456789012",
          credentialType: "iam_role",
          credentialEncrypted: "encrypted-data",
          credentialIv: "iv-data",
          credentialAuthTag: "auth-tag-data",
          resourcePrefix: null,
          lastValidatedAt: new Date(),
          lastError: null,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await listCloudAccounts(teamId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("acc-1");
        expect(result.data[0].provider).toBe("aws");
        // Should NOT contain encrypted fields
        expect(
          (result.data[0] as unknown as Record<string, unknown>).credentialEncrypted,
        ).toBeUndefined();
        expect(
          (result.data[0] as unknown as Record<string, unknown>).credentialIv,
        ).toBeUndefined();
        expect(
          (result.data[0] as unknown as Record<string, unknown>).credentialAuthTag,
        ).toBeUndefined();
      }
    });

    it("should require authentication", async () => {
      mockAuth.mockResolvedValue(null as any);

      const result = await listCloudAccounts(teamId);

      expect(result.success).toBe(false);
    });

    it("should require team membership", async () => {
      mockIsUserTeamMember.mockResolvedValue(false);

      const result = await listCloudAccounts(teamId);

      expect(result.success).toBe(false);
    });
  });

  describe("linkCloudAccount", () => {
    it("should call createCloudAccount model", async () => {
      mockCreateCloudAccount.mockResolvedValue({
        id: "acc-new",
        teamId,
        provider: "aws",
        name: "New AWS",
        status: "pending",
        externalAccountId: "123456789012",
        credentialType: "iam_role",
        credentialEncrypted: "enc",
        credentialIv: "iv",
        credentialAuthTag: "tag",
        resourcePrefix: null,
        lastValidatedAt: null,
        lastError: null,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await linkCloudAccount(teamId, {
        provider: "aws",
        name: "New AWS",
        externalAccountId: "123456789012",
        credentialType: "iam_role",
        credential: '{"roleArn": "arn:aws:iam::role/test"}',
      });

      expect(result.success).toBe(true);
      expect(mockCreateCloudAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId,
          provider: "aws",
          createdBy: userId,
        }),
      );
    });
  });

  describe("unlinkCloudAccount", () => {
    it("should call deleteCloudAccount model", async () => {
      mockDeleteCloudAccount.mockResolvedValue({
        id: "acc-1",
        status: "revoked",
      } as any);

      const result = await unlinkCloudAccount(teamId, "acc-1");

      expect(result.success).toBe(true);
      expect(mockDeleteCloudAccount).toHaveBeenCalledWith("acc-1");
    });
  });
});
