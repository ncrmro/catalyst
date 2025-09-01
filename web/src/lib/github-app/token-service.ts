import { db } from "@/db";
import { githubUserTokens } from "@/db/schema";
import { encryptToken, decryptToken } from "./token-crypto";
import { eq } from "drizzle-orm";

export interface GitHubTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  installationId?: string;
}

/**
 * Store GitHub App user tokens in the database with encryption
 * @param userId The user ID to store tokens for
 * @param tokens The tokens to store
 */
export async function storeGitHubTokens(userId: string, tokens: GitHubTokens): Promise<void> {
  // Encrypt the tokens
  const encryptedAccess = encryptToken(tokens.accessToken);
  const encryptedRefresh = encryptToken(tokens.refreshToken);
  
  // Update or insert tokens using upsert pattern
  await db
    .insert(githubUserTokens)
    .values({
      userId,
      installationId: tokens.installationId,
      accessTokenEncrypted: encryptedAccess.encryptedData,
      accessTokenIv: encryptedAccess.iv,
      accessTokenAuthTag: encryptedAccess.authTag,
      refreshTokenEncrypted: encryptedRefresh.encryptedData,
      refreshTokenIv: encryptedRefresh.iv,
      refreshTokenAuthTag: encryptedRefresh.authTag,
      tokenExpiresAt: tokens.expiresAt,
      tokenScope: tokens.scope,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: githubUserTokens.userId,
      set: {
        installationId: tokens.installationId,
        accessTokenEncrypted: encryptedAccess.encryptedData,
        accessTokenIv: encryptedAccess.iv,
        accessTokenAuthTag: encryptedAccess.authTag,
        refreshTokenEncrypted: encryptedRefresh.encryptedData,
        refreshTokenIv: encryptedRefresh.iv,
        refreshTokenAuthTag: encryptedRefresh.authTag,
        tokenExpiresAt: tokens.expiresAt,
        tokenScope: tokens.scope,
        updatedAt: new Date(),
      },
    });
}

/**
 * Retrieve GitHub App user tokens from the database with decryption
 * @param userId The user ID to retrieve tokens for
 * @returns Decrypted tokens or null if not found
 */
export async function getGitHubTokens(userId: string): Promise<GitHubTokens | null> {
  const tokenRecord = await db
    .select()
    .from(githubUserTokens)
    .where(eq(githubUserTokens.userId, userId))
    .limit(1);
    
  if (!tokenRecord.length) {
    return null;
  }
  
  const record = tokenRecord[0];
  
  // Check if we have encrypted tokens
  if (!record.accessTokenEncrypted || !record.accessTokenIv || !record.accessTokenAuthTag ||
      !record.refreshTokenEncrypted || !record.refreshTokenIv || !record.refreshTokenAuthTag) {
    return null;
  }
  
  try {
    // Decrypt the tokens
    const accessToken = decryptToken(
      record.accessTokenEncrypted,
      record.accessTokenIv,
      record.accessTokenAuthTag
    );
    
    const refreshToken = decryptToken(
      record.refreshTokenEncrypted,
      record.refreshTokenIv,
      record.refreshTokenAuthTag
    );
    
    return {
      accessToken,
      refreshToken,
      expiresAt: record.tokenExpiresAt!,
      scope: record.tokenScope || '',
      installationId: record.installationId || undefined,
    };
  } catch (error) {
    console.error('Failed to decrypt GitHub tokens:', error);
    return null;
  }
}

/**
 * Delete GitHub App user tokens for a user
 * @param userId The user ID to delete tokens for
 */
export async function deleteGitHubTokens(userId: string): Promise<void> {
  await db
    .delete(githubUserTokens)
    .where(eq(githubUserTokens.userId, userId));
}