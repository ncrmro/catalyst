/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/team-auth", () => ({
  isUserTeamMember: vi.fn(),
  isUserTeamAdminOrOwner: vi.fn(),
}));

vi.mock("@/models/managed-clusters", () => ({
  getManagedClusters: vi.fn(),
  createManagedCluster: vi.fn(),
  requestClusterDeletion: vi.fn(),
  updateManagedCluster: vi.fn(),
}));

vi.mock("@/models/cloud-accounts", () => ({
  getCloudAccounts: vi.fn(),
}));

import { auth } from "@/auth";
import {
  isUserTeamMember,
  isUserTeamAdminOrOwner,
} from "@/lib/team-auth";
import {
  getManagedClusters,
  createManagedCluster as createManagedClusterModel,
  requestClusterDeletion,
} from "@/models/managed-clusters";
import { getCloudAccounts } from "@/models/cloud-accounts";
import {
  listManagedClusters,
  createManagedCluster,
  deleteManagedCluster,
} from "@/actions/managed-clusters";

const mockAuth = vi.mocked(auth);
const mockIsUserTeamMember = vi.mocked(isUserTeamMember);
const mockIsUserTeamAdminOrOwner = vi.mocked(isUserTeamAdminOrOwner);
const mockGetManagedClusters = vi.mocked(getManagedClusters);
const mockCreateManagedCluster = vi.mocked(createManagedClusterModel);
const mockRequestClusterDeletion = vi.mocked(requestClusterDeletion);
const mockGetCloudAccounts = vi.mocked(getCloudAccounts);

describe("managed clusters actions", () => {
  const teamId = "team-123";
  const userId = "user-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: userId } } as any);
    mockIsUserTeamMember.mockResolvedValue(true);
    mockIsUserTeamAdminOrOwner.mockResolvedValue(true);
  });

  describe("listManagedClusters", () => {
    it("should require team membership", async () => {
      mockIsUserTeamMember.mockResolvedValue(false);

      const result = await listManagedClusters(teamId);

      expect(result.success).toBe(false);
    });

    it("should return cluster summaries", async () => {
      mockGetManagedClusters.mockResolvedValue([
        {
          id: "cluster-1",
          cloudAccountId: "acc-1",
          teamId,
          name: "my-cluster",
          status: "active",
          region: "us-east-1",
          kubernetesVersion: "1.29",
          config: null,
          kubeconfigEncrypted: "enc",
          kubeconfigIv: "iv",
          kubeconfigAuthTag: "tag",
          deletionProtection: true,
          deleteGracePeriodEnds: null,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await listManagedClusters(teamId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe("my-cluster");
        // Should NOT contain kubeconfig
        expect(
          (result.data[0] as unknown as Record<string, unknown>).kubeconfigEncrypted,
        ).toBeUndefined();
      }
    });
  });

  describe("createManagedCluster", () => {
    it("should require team admin", async () => {
      mockIsUserTeamAdminOrOwner.mockResolvedValue(false);

      const result = await createManagedCluster(teamId, {
        cloudAccountId: "acc-1",
        name: "test",
        region: "us-east-1",
        kubernetesVersion: "1.29",
      });

      expect(result.success).toBe(false);
    });

    it("should validate cloud account belongs to team", async () => {
      mockGetCloudAccounts.mockResolvedValue([]);

      const result = await createManagedCluster(teamId, {
        cloudAccountId: "acc-wrong",
        name: "test",
        region: "us-east-1",
        kubernetesVersion: "1.29",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("should create cluster when authorized", async () => {
      mockGetCloudAccounts.mockResolvedValue([{ id: "acc-1" } as any]);
      mockCreateManagedCluster.mockResolvedValue({
        id: "cluster-new",
      } as any);

      const result = await createManagedCluster(teamId, {
        cloudAccountId: "acc-1",
        name: "new-cluster",
        region: "us-east-1",
        kubernetesVersion: "1.29",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("deleteManagedCluster", () => {
    it("should require explicit confirmation matching cluster name", async () => {
      mockGetManagedClusters.mockResolvedValue([
        { id: "cluster-1", name: "production-cluster" } as any,
      ]);

      const result = await deleteManagedCluster(
        teamId,
        "cluster-1",
        "wrong-name",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Confirmation name does not match");
      }
    });

    it("should delete when confirmation matches", async () => {
      mockGetManagedClusters.mockResolvedValue([
        { id: "cluster-1", name: "my-cluster" } as any,
      ]);
      mockRequestClusterDeletion.mockResolvedValue({
        id: "cluster-1",
      } as any);

      const result = await deleteManagedCluster(
        teamId,
        "cluster-1",
        "my-cluster",
      );

      expect(result.success).toBe(true);
    });
  });
});
