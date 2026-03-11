/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db";
import {
  cloudAccounts,
  managedClusters,
  nodePools,
  teams,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getNodePools, createNodePool, updateNodePool } from "@/models/node-pools";
import { createManagedCluster } from "@/models/managed-clusters";
import { createCloudAccount } from "@/models/cloud-accounts";
import { userFactory, teamFactory } from "../../factories";

describe("Node Pools Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  let testCloudAccountId: string;
  let testClusterId: string;
  const createdPoolIds: string[] = [];

  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  beforeAll(async () => {
    const user = await userFactory.create({ name: "Pool Test User" });
    testUserId = user.id;

    const team = await teamFactory.create({
      ownerId: user.id,
      name: "Pool Test Team",
    });
    testTeamId = team.id;

    const account = await createCloudAccount({
      teamId: testTeamId,
      provider: "aws",
      name: "Pool Test AWS",
      externalAccountId: "555444333222",
      credentialType: "iam_role",
      credential: '{"roleArn": "test"}',
      createdBy: testUserId,
    });
    testCloudAccountId = account.id;

    const cluster = await createManagedCluster({
      cloudAccountId: testCloudAccountId,
      teamId: testTeamId,
      name: "pool-test-cluster",
      region: "us-east-1",
      kubernetesVersion: "1.29",
      createdBy: testUserId,
    });
    testClusterId = cluster.id;
  });

  afterAll(async () => {
    for (const id of createdPoolIds) {
      await db.delete(nodePools).where(eq(nodePools.id, id)).catch(() => {});
    }
    await db
      .delete(managedClusters)
      .where(eq(managedClusters.id, testClusterId))
      .catch(() => {});
    await db
      .delete(cloudAccounts)
      .where(eq(cloudAccounts.id, testCloudAccountId))
      .catch(() => {});
    await db.delete(teams).where(eq(teams.id, testTeamId)).catch(() => {});
    await db.delete(users).where(eq(users.id, testUserId)).catch(() => {});
  });

  describe("getNodePools", () => {
    it("should return pools filtered by clusterIds", async () => {
      const pool = await createNodePool({
        clusterId: testClusterId,
        name: "general",
        instanceType: "t3.medium",
        minNodes: 1,
        maxNodes: 5,
        currentNodes: 2,
        spotEnabled: false,
        status: "active",
      });
      createdPoolIds.push(pool.id);

      const results = await getNodePools({ clusterIds: [testClusterId] });

      expect(results.length).toBeGreaterThanOrEqual(1);
      const found = results.find((p) => p.id === pool.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe("general");
      expect(found?.instanceType).toBe("t3.medium");
    });
  });

  describe("createNodePool", () => {
    it("should create with autoscaling config", async () => {
      const pool = await createNodePool({
        clusterId: testClusterId,
        name: "compute",
        instanceType: "c5.2xlarge",
        minNodes: 0,
        maxNodes: 10,
        currentNodes: 0,
        spotEnabled: true,
        status: "provisioning",
      });
      createdPoolIds.push(pool.id);

      expect(pool.minNodes).toBe(0);
      expect(pool.maxNodes).toBe(10);
      expect(pool.spotEnabled).toBe(true);
    });
  });

  describe("updateNodePool", () => {
    it("should update maxNodes", async () => {
      const pool = await createNodePool({
        clusterId: testClusterId,
        name: "update-test",
        instanceType: "t3.large",
        minNodes: 1,
        maxNodes: 3,
        currentNodes: 1,
        spotEnabled: false,
        status: "active",
      });
      createdPoolIds.push(pool.id);

      const updated = await updateNodePool(pool.id, { maxNodes: 10 });

      expect(updated.maxNodes).toBe(10);
    });
  });
});
