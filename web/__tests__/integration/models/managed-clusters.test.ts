/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db";
import { cloudAccounts, managedClusters, teams, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getManagedClusters,
  createManagedCluster,
  requestClusterDeletion,
  updateManagedCluster,
} from "@/models/managed-clusters";
import { createCloudAccount } from "@/models/cloud-accounts";
import { userFactory, teamFactory } from "../../factories";

describe("Managed Clusters Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testCloudAccountId: string;
  const createdClusterIds: string[] = [];

  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  beforeAll(async () => {
    const user = await userFactory.create({ name: "Cluster Test User" });
    testUserId = user.id;

    const team = await teamFactory.create({
      ownerId: user.id,
      name: "Cluster Test Team",
    });
    testTeamId = team.id;

    const account = await createCloudAccount({
      teamId: testTeamId,
      provider: "aws",
      name: "Cluster Test AWS",
      externalAccountId: "999888777666",
      credentialType: "iam_role",
      credential: '{"roleArn": "test"}',
      createdBy: testUserId,
    });
    testCloudAccountId = account.id;
  });

  afterAll(async () => {
    for (const id of createdClusterIds) {
      await db
        .delete(managedClusters)
        .where(eq(managedClusters.id, id))
        .catch(() => {});
    }
    await db
      .delete(cloudAccounts)
      .where(eq(cloudAccounts.id, testCloudAccountId))
      .catch(() => {});
    await db.delete(teams).where(eq(teams.id, testTeamId)).catch(() => {});
    await db.delete(users).where(eq(users.id, testUserId)).catch(() => {});
  });

  describe("getManagedClusters", () => {
    it("should return clusters filtered by teamIds", async () => {
      const cluster = await createManagedCluster({
        cloudAccountId: testCloudAccountId,
        teamId: testTeamId,
        name: "test-cluster-1",
        region: "us-east-1",
        kubernetesVersion: "1.29",
        createdBy: testUserId,
      });
      createdClusterIds.push(cluster.id);

      const results = await getManagedClusters({ teamIds: [testTeamId] });

      expect(results.length).toBeGreaterThanOrEqual(1);
      const found = results.find((c) => c.id === cluster.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe("test-cluster-1");
    });

    it("should filter by statuses", async () => {
      const results = await getManagedClusters({
        teamIds: [testTeamId],
        statuses: ["deleted"],
      });

      expect(results.every((c) => c.status === "deleted")).toBe(true);
    });
  });

  describe("createManagedCluster", () => {
    it("should default to provisioning status and deletionProtection true", async () => {
      const cluster = await createManagedCluster({
        cloudAccountId: testCloudAccountId,
        teamId: testTeamId,
        name: "test-cluster-defaults",
        region: "us-west-2",
        kubernetesVersion: "1.30",
        createdBy: testUserId,
      });
      createdClusterIds.push(cluster.id);

      expect(cluster.status).toBe("provisioning");
      expect(cluster.deletionProtection).toBe(true);
    });
  });

  describe("requestClusterDeletion", () => {
    it("should reject when deletionProtection is true", async () => {
      const cluster = await createManagedCluster({
        cloudAccountId: testCloudAccountId,
        teamId: testTeamId,
        name: "test-cluster-protected",
        region: "eu-west-1",
        kubernetesVersion: "1.28",
        deletionProtection: true,
        createdBy: testUserId,
      });
      createdClusterIds.push(cluster.id);

      await expect(requestClusterDeletion(cluster.id)).rejects.toThrow(
        "Deletion protection is enabled",
      );
    });

    it("should set grace period and status when protection is off", async () => {
      const cluster = await createManagedCluster({
        cloudAccountId: testCloudAccountId,
        teamId: testTeamId,
        name: "test-cluster-unprotected",
        region: "eu-west-1",
        kubernetesVersion: "1.28",
        deletionProtection: false,
        createdBy: testUserId,
      });
      createdClusterIds.push(cluster.id);

      const beforeDeletion = Date.now();
      const deleted = await requestClusterDeletion(cluster.id);

      expect(deleted.status).toBe("deleting");
      expect(deleted.deleteGracePeriodEnds).toBeInstanceOf(Date);
      // Grace period should be ~72 hours from now
      const gracePeriodMs =
        deleted.deleteGracePeriodEnds!.getTime() - beforeDeletion;
      const seventyTwoHoursMs = 72 * 60 * 60 * 1000;
      expect(gracePeriodMs).toBeGreaterThan(seventyTwoHoursMs - 5000);
      expect(gracePeriodMs).toBeLessThan(seventyTwoHoursMs + 5000);
    });
  });
});
