import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createProviderConfig,
  deleteProviderConfig,
  createClusterClaim,
  deleteClusterClaim,
  syncClusterStatus,
} from "@/models/crossplane-bridge";
import { db } from "@/db";
import { decrypt } from "@tetrastack/backend/utils";
import {
  getCustomObjectsApi,
  getCoreV1Api,
  getClusterConfig,
  ensureTeamNamespace,
} from "@/lib/k8s-client";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/k8s-client", () => ({
  getCustomObjectsApi: vi.fn(),
  getCoreV1Api: vi.fn(),
  getClusterConfig: vi.fn(),
  ensureTeamNamespace: vi.fn(),
  sanitizeNamespaceName: vi.fn((name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 63),
  ),
}));

vi.mock("@tetrastack/backend/utils", () => ({
  decrypt: vi.fn(),
}));

describe("crossplane-bridge model", () => {
  const mockCustomApi = {
    createClusterCustomObject: vi.fn(),
    deleteClusterCustomObject: vi.fn(),
    createNamespacedCustomObject: vi.fn(),
    deleteNamespacedCustomObject: vi.fn(),
    getNamespacedCustomObject: vi.fn(),
  };

  const mockCoreApi = {
    createNamespacedSecret: vi.fn(),
    deleteNamespacedSecret: vi.fn(),
  };

  // Sentinel classes used to verify makeApiClient dispatching
  class MockCustomObjectsApiClass {}
  class MockCoreV1ApiClass {}

  function makeMakeApiClient() {
    return vi.fn((ApiClass: unknown) => {
      if (ApiClass === MockCustomObjectsApiClass) return mockCustomApi;
      if (ApiClass === MockCoreV1ApiClass) return mockCoreApi;
      throw new Error(`Unexpected ApiClass passed to makeApiClient: ${String(ApiClass)}`);
    });
  }

  const mockKubeConfig = {
    makeApiClient: makeMakeApiClient(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCustomObjectsApi).mockResolvedValue(MockCustomObjectsApiClass as never);
    vi.mocked(getCoreV1Api).mockResolvedValue(MockCoreV1ApiClass as never);
    vi.mocked(getClusterConfig).mockResolvedValue(mockKubeConfig as never);
    // Reset makeApiClient so each test gets a fresh spy
    mockKubeConfig.makeApiClient = makeMakeApiClient();
  });

  describe("createProviderConfig", () => {
    it("should create an AWS ProviderConfig with AssumeRole", async () => {
      const mockAccount = {
        id: "acc-123",
        provider: "aws",
        credentialType: "iam_role",
        credentialEncrypted: "encrypted",
        credentialIv: "iv",
        credentialAuthTag: "tag",
      };

      vi.mocked(db.select().from().where().limit).mockResolvedValue([mockAccount] as any);
      vi.mocked(decrypt).mockReturnValue(JSON.stringify({
        roleARN: "arn:aws:iam::123456789012:role/Catalyst-Role",
        externalID: "ext-123",
      }));

      await createProviderConfig("acc-123");

      expect(mockCustomApi.createClusterCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({
          group: "aws.upbound.io",
          version: "v1beta1",
          plural: "providerconfigs",
          body: expect.objectContaining({
            metadata: { name: "acc-123" },
            spec: expect.objectContaining({
              assumeRoleChain: [{
                roleARN: "arn:aws:iam::123456789012:role/Catalyst-Role",
                externalID: "ext-123",
              }],
            }),
          }),
        })
      );

      // Verify DB update to 'active'
      expect(db.update).toHaveBeenCalled();
    });

    it("should create an AWS ProviderConfig with Access Key", async () => {
      const mockAccount = {
        id: "acc-456",
        provider: "aws",
        credentialType: "access_key",
        credentialEncrypted: "encrypted",
        credentialIv: "iv",
        credentialAuthTag: "tag",
      };

      vi.mocked(db.select().from().where().limit).mockResolvedValue([mockAccount] as any);
      vi.mocked(decrypt).mockReturnValue(JSON.stringify({
        accessKeyId: "AKIA...",
        secretAccessKey: "SECRET...",
      }));

      await createProviderConfig("acc-456");

      // Verify Secret creation
      expect(mockCoreApi.createNamespacedSecret).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          metadata: { name: "aws-creds-acc-456" },
          stringData: expect.objectContaining({
            creds: expect.stringContaining("AKIA..."),
          }),
        }),
      }));

      // Verify ProviderConfig creation
      expect(mockCustomApi.createClusterCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({
          group: "aws.upbound.io",
          version: "v1beta1",
          plural: "providerconfigs",
          body: expect.objectContaining({
            metadata: { name: "acc-456" },
            spec: expect.objectContaining({
              credentials: {
                source: "Secret",
                secretRef: {
                  namespace: "crossplane-system",
                  name: "aws-creds-acc-456",
                  key: "creds",
                },
              },
            }),
          }),
        })
      );
    });

    it("should handle K8s errors and update DB status to error", async () => {
      const mockAccount = {
        id: "acc-err",
        provider: "aws",
        credentialType: "iam_role",
        credentialEncrypted: "encrypted",
        credentialIv: "iv",
        credentialAuthTag: "tag",
      };

      vi.mocked(db.select().from().where().limit).mockResolvedValue([mockAccount] as any);
      vi.mocked(decrypt).mockReturnValue(JSON.stringify({ roleARN: "foo", externalID: "bar" }));
      mockCustomApi.createClusterCustomObject.mockRejectedValue(new Error("K8s API Failure"));

      await expect(createProviderConfig("acc-err")).rejects.toThrow("K8s API Failure");

      // Verify DB update to 'error'
      expect(db.set).toHaveBeenCalledWith(expect.objectContaining({
        status: "error",
        lastError: "K8s API Failure",
      }));
    });
  });

  describe("createClusterClaim", () => {
    it("should create a KubernetesCluster Claim in team namespace", async () => {
      const mockCluster = {
        id: "clus-123",
        teamId: "team-123",
        cloudAccountId: "acc-123",
        name: "my-cluster",
        region: "us-east-1",
        kubernetesVersion: "1.31",
        status: "provisioning",
      };
      const mockTeam = { id: "team-123", name: "my-team" };
      const mockPools = [
        { name: "pool-1", instanceType: "t3.medium", minNodes: 1, maxNodes: 3, spotEnabled: false },
      ];

      const mockLimit = vi.fn()
        .mockResolvedValueOnce([mockCluster])
        .mockResolvedValueOnce([mockTeam]);
      
      const mockWhere = vi.fn()
        .mockReturnValueOnce({ limit: mockLimit }) // for cluster
        .mockReturnValueOnce({ limit: mockLimit }) // for team
        .mockResolvedValueOnce(mockPools);        // for pools

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: mockWhere,
        }),
      } as any);

      await createClusterClaim("clus-123");

      expect(ensureTeamNamespace).toHaveBeenCalled();
      expect(mockCustomApi.createNamespacedCustomObject).toHaveBeenCalledWith(
        expect.objectContaining({
          group: "catalyst.tetraship.app",
          version: "v1alpha1",
          namespace: "my-team",
          plural: "kubernetesclusters",
          body: expect.objectContaining({
            // Name includes an ID suffix for uniqueness: <sanitized-name>-<last-8-of-id>
            metadata: { name: "my-cluster-clus-123", namespace: "my-team" },
            spec: expect.objectContaining({
              region: "us-east-1",
              providerConfigRef: "acc-123",
            }),
          }),
        })
      );
    });
  });

  describe("syncClusterStatus", () => {
    it("should update DB status to active if Ready condition is True", async () => {
      const mockCluster = { id: "clus-123", teamId: "team-123", name: "my-clus", status: "provisioning" };
      const mockTeam = { id: "team-123", name: "my-team" };

      const mockLimit = vi.fn()
        .mockResolvedValueOnce([mockCluster])
        .mockResolvedValueOnce([mockTeam]);
      
      const mockWhere = vi.fn()
        .mockReturnValue({ limit: mockLimit });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: mockWhere,
        })
      } as any);

      mockCustomApi.getNamespacedCustomObject.mockResolvedValue({
        status: {
          conditions: [
            { type: "Ready", status: "True" }
          ]
        }
      });

      await syncClusterStatus("clus-123");

      expect(db.set).toHaveBeenCalledWith(expect.objectContaining({
        status: "active",
      }));
    });

    it("should update DB status to error if Synced condition is False with ReconcileError", async () => {
      const mockCluster = { id: "clus-123", teamId: "team-123", name: "my-clus", status: "provisioning" };
      const mockTeam = { id: "team-123", name: "my-team" };

      const mockLimit = vi.fn()
        .mockResolvedValueOnce([mockCluster])
        .mockResolvedValueOnce([mockTeam]);
      
      const mockWhere = vi.fn()
        .mockReturnValue({ limit: mockLimit });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: mockWhere,
        })
      } as any);

      mockCustomApi.getNamespacedCustomObject.mockResolvedValue({
        status: {
          conditions: [
            { type: "Ready", status: "False" },
            { type: "Synced", status: "False", reason: "ReconcileError" }
          ]
        }
      });

      await syncClusterStatus("clus-123");

      expect(db.set).toHaveBeenCalledWith(expect.objectContaining({
        status: "error",
      }));
    });
  });
});
