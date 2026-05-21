/**
 * Cloud Accounts Model
 *
 * Database operations for cloud_accounts table.
 * Handles credential encryption/decryption and CRUD operations.
 * No authentication — handled by actions layer.
 */

import { db } from "@/db";
import { cloudAccounts } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { encrypt, decrypt } from "@tetrastack/backend/utils";
import type { InferInsertModel } from "drizzle-orm";

export type InsertCloudAccount = InferInsertModel<typeof cloudAccounts>;

export interface GetCloudAccountsParams {
  ids?: string[];
  teamIds?: string[];
  providers?: string[];
  statuses?: string[];
}

/**
 * Get cloud accounts with optional filtering.
 * Follows bulk operation pattern (returns [] if no conditions).
 */
export async function getCloudAccounts(params: GetCloudAccountsParams) {
  const { ids, teamIds, providers, statuses } = params;

  const conditions = [];
  if (ids && ids.length > 0) {
    conditions.push(inArray(cloudAccounts.id, ids));
  }
  if (teamIds && teamIds.length > 0) {
    conditions.push(inArray(cloudAccounts.teamId, teamIds));
  }
  if (providers && providers.length > 0) {
    conditions.push(inArray(cloudAccounts.provider, providers));
  }
  if (statuses && statuses.length > 0) {
    conditions.push(inArray(cloudAccounts.status, statuses));
  }

  if (conditions.length === 0) {
    return [];
  }

  return db
    .select()
    .from(cloudAccounts)
    .where(and(...conditions));
}

/**
 * Encrypt a cloud credential string using AES-256-GCM.
 */
export function encryptCloudCredential(credential: string) {
  return encrypt(credential);
}

/**
 * Decrypt a cloud credential using AES-256-GCM.
 */
export function decryptCloudCredential(
  encryptedData: string,
  iv: string,
  authTag: string,
): string {
  return decrypt(encryptedData, iv, authTag);
}

/**
 * Create a cloud account with encrypted credentials.
 */
export async function createCloudAccount(data: {
  teamId: string;
  provider: string;
  name: string;
  externalAccountId: string;
  credentialType: string;
  credential: string;
  resourcePrefix?: string;
  createdBy: string;
}) {
  const { credential, ...rest } = data;
  const { encryptedData, iv, authTag } = encryptCloudCredential(credential);

  const [created] = await db
    .insert(cloudAccounts)
    .values({
      ...rest,
      status: "pending",
      credentialEncrypted: encryptedData,
      credentialIv: iv,
      credentialAuthTag: authTag,
    })
    .returning();

  return created;
}

/**
 * Update a cloud account by ID.
 */
export async function updateCloudAccount(
  id: string,
  data: Partial<{
    name: string;
    status: string;
    resourcePrefix: string | null;
    lastValidatedAt: Date | null;
    lastError: string | null;
  }>,
) {
  const [updated] = await db
    .update(cloudAccounts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(cloudAccounts.id, id))
    .returning();

  return updated;
}

/**
 * Soft-delete a cloud account by setting status to "revoked".
 */
export async function deleteCloudAccount(id: string) {
  const [updated] = await db
    .update(cloudAccounts)
    .set({
      status: "revoked",
      updatedAt: new Date(),
    })
    .where(eq(cloudAccounts.id, id))
    .returning();

  return updated;
}
