/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db";
import { cloudAccounts, teams, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getCloudAccounts,
  createCloudAccount,
  updateCloudAccount,
  deleteCloudAccount,
  decryptCloudCredential,
} from "@/models/cloud-accounts";
import { userFactory, teamFactory } from "../../factories";

describe("Cloud Accounts Model Integration", () => {
  let testUserId: string;
  let testTeamId: string;
  const createdAccountIds: string[] = [];

  beforeAll(() => {
    // Set test encryption key
    process.env.TOKEN_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  beforeAll(async () => {
    const user = await userFactory.create({ name: "Cloud Test User" });
    testUserId = user.id;

    const team = await teamFactory.create({
      ownerId: user.id,
      name: "Cloud Test Team",
    });
    testTeamId = team.id;
  });

  afterAll(async () => {
    // Clean up created accounts
    for (const id of createdAccountIds) {
      await db
        .delete(cloudAccounts)
        .where(eq(cloudAccounts.id, id))
        .catch(() => {});
    }
    await db.delete(teams).where(eq(teams.id, testTeamId)).catch(() => {});
    await db.delete(users).where(eq(users.id, testUserId)).catch(() => {});
  });

  describe("getCloudAccounts", () => {
    it("should return accounts filtered by teamIds", async () => {
      const account = await createCloudAccount({
        teamId: testTeamId,
        provider: "aws",
        name: "Test AWS Account",
        externalAccountId: "123456789012",
        credentialType: "iam_role",
        credential: JSON.stringify({ roleArn: "arn:aws:iam::role/test" }),
        createdBy: testUserId,
      });
      createdAccountIds.push(account.id);

      const results = await getCloudAccounts({ teamIds: [testTeamId] });

      expect(results.length).toBeGreaterThanOrEqual(1);
      const found = results.find((a) => a.id === account.id);
      expect(found).toBeDefined();
      expect(found?.provider).toBe("aws");
      expect(found?.name).toBe("Test AWS Account");
    });

    it("should return empty array with no conditions", async () => {
      const results = await getCloudAccounts({});
      expect(results).toEqual([]);
    });

    it("should filter by providers", async () => {
      const account = await createCloudAccount({
        teamId: testTeamId,
        provider: "gcp",
        name: "Test GCP Account",
        externalAccountId: "my-project-123456",
        credentialType: "service_account",
        credential: JSON.stringify({ type: "service_account", project_id: "test" }),
        createdBy: testUserId,
      });
      createdAccountIds.push(account.id);

      const awsResults = await getCloudAccounts({
        teamIds: [testTeamId],
        providers: ["aws"],
      });
      const gcpResults = await getCloudAccounts({
        teamIds: [testTeamId],
        providers: ["gcp"],
      });

      expect(awsResults.every((a) => a.provider === "aws")).toBe(true);
      expect(gcpResults.some((a) => a.provider === "gcp")).toBe(true);
    });
  });

  describe("createCloudAccount", () => {
    it("should create with encrypted credential fields", async () => {
      const credential = JSON.stringify({
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      });

      const account = await createCloudAccount({
        teamId: testTeamId,
        provider: "aws",
        name: "Encrypted Test Account",
        externalAccountId: "987654321012",
        credentialType: "access_key",
        credential,
        createdBy: testUserId,
      });
      createdAccountIds.push(account.id);

      // Credential fields should be present and encrypted
      expect(account.credentialEncrypted).toBeDefined();
      expect(account.credentialIv).toBeDefined();
      expect(account.credentialAuthTag).toBeDefined();
      expect(account.credentialEncrypted).not.toBe(credential);

      // Plain credential should NOT be on the returned record
      expect((account as Record<string, unknown>).credential).toBeUndefined();

      // Should decrypt back to original
      const decrypted = decryptCloudCredential(
        account.credentialEncrypted,
        account.credentialIv,
        account.credentialAuthTag,
      );
      expect(decrypted).toBe(credential);
    });

    it("should default status to pending", async () => {
      const account = await createCloudAccount({
        teamId: testTeamId,
        provider: "azure",
        name: "Azure Pending Account",
        externalAccountId: "aaaabbbb-cccc-dddd-eeee-ffffffffffff",
        credentialType: "service_account",
        credential: '{"clientId": "test"}',
        createdBy: testUserId,
      });
      createdAccountIds.push(account.id);

      expect(account.status).toBe("pending");
    });
  });

  describe("updateCloudAccount", () => {
    it("should update status to active", async () => {
      const account = await createCloudAccount({
        teamId: testTeamId,
        provider: "aws",
        name: "Update Test Account",
        externalAccountId: "111122223333",
        credentialType: "iam_role",
        credential: '{"roleArn": "test"}',
        createdBy: testUserId,
      });
      createdAccountIds.push(account.id);

      const updated = await updateCloudAccount(account.id, {
        status: "active",
        lastValidatedAt: new Date(),
      });

      expect(updated.status).toBe("active");
      expect(updated.lastValidatedAt).toBeInstanceOf(Date);
    });
  });

  describe("deleteCloudAccount", () => {
    it("should soft-delete by setting status to revoked", async () => {
      const account = await createCloudAccount({
        teamId: testTeamId,
        provider: "aws",
        name: "Delete Test Account",
        externalAccountId: "444455556666",
        credentialType: "iam_role",
        credential: '{"roleArn": "test"}',
        createdBy: testUserId,
      });
      createdAccountIds.push(account.id);

      const deleted = await deleteCloudAccount(account.id);

      expect(deleted.status).toBe("revoked");
    });
  });
});
