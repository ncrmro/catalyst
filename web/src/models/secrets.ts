/**
 * Secret Management Models
 *
 * Core business logic for three-tier secret management (Team → Project → Environment).
 * Handles encryption, decryption, and precedence-based resolution.
 *
 * @see specs/001-environments/spec.md (FR-ENV-034 through FR-ENV-041)
 */

import { db } from "@/db";
import { secrets } from "@/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { encrypt, decrypt } from "@tetrastack/backend/utils";
import type { ResolvedSecret, SecretScope } from "@/types/secrets";

/**
 * Encrypt a secret value
 *
 * @param value - Plain text secret value
 * @returns Encrypted data with IV and auth tag
 */
export function encryptSecret(value: string) {
  return encrypt(value);
}

/**
 * Decrypt a secret value
 *
 * @param encryptedValue - Encrypted hex string
 * @param iv - Initialization vector hex string
 * @param authTag - Authentication tag hex string
 * @returns Decrypted plain text value
 */
export function decryptSecret(
  encryptedValue: string,
  iv: string,
  authTag: string,
): string {
  return decrypt(encryptedValue, iv, authTag);
}

/**
 * Resolve secrets for an environment with precedence (Environment > Project > Team)
 *
 * @param teamId - Team ID
 * @param projectId - Project ID (optional for team-level resolution)
 * @param environmentId - Environment ID (optional for project-level resolution)
 * @returns Map of secret names to resolved values with source information
 */
export async function resolveSecretsForEnvironment(
  teamId: string,
  projectId?: string | null,
  environmentId?: string | null,
): Promise<Map<string, ResolvedSecret>> {
  const resolved = new Map<string, ResolvedSecret>();

  try {
    // Fetch secrets in order of precedence (team → project → environment)
    // Query pattern: WHERE team_id = ? AND (
    //   (project_id IS NULL AND environment_id IS NULL) OR     -- Team secrets
    //   (project_id = ? AND environment_id IS NULL) OR         -- Project secrets
    //   (environment_id = ?)                                    -- Environment secrets
    // )

    const conditions = [
      // Team-level secrets
      and(
        eq(secrets.teamId, teamId),
        isNull(secrets.projectId),
        isNull(secrets.environmentId),
      ),
    ];

    // Add project-level secrets if projectId provided
    if (projectId) {
      conditions.push(
        and(
          eq(secrets.teamId, teamId),
          eq(secrets.projectId, projectId),
          isNull(secrets.environmentId),
        ),
      );
    }

    // Add environment-level secrets if environmentId provided
    if (environmentId) {
      if (!projectId) {
        throw new Error(
          "resolveSecretsForEnvironment: projectId is required when environmentId is provided",
        );
      }

      conditions.push(
        and(
          eq(secrets.teamId, teamId),
          eq(secrets.projectId, projectId),
          eq(secrets.environmentId, environmentId),
        ),
      );
    }

    // Fetch all secrets matching the conditions
    const allSecrets = await db
      .select()
      .from(secrets)
      .where(or(...conditions));

    // Separate secrets by source for proper precedence application
    const teamSecrets = allSecrets.filter(
      (s) => !s.projectId && !s.environmentId,
    );
    const projectSecrets = allSecrets.filter(
      (s) => s.projectId && !s.environmentId,
    );
    const envSecrets = allSecrets.filter((s) => s.environmentId);

    // Apply in precedence order: team → project → environment
    for (const secret of teamSecrets) {
      try {
        const value = decryptSecret(
          secret.encryptedValue,
          secret.iv,
          secret.authTag,
        );
        resolved.set(secret.name, {
          name: secret.name,
          value,
          source: "team",
          description: secret.description,
        });
      } catch (error) {
        console.error("Failed to decrypt team secret", {
          secretName: secret.name,
          teamId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const secret of projectSecrets) {
      try {
        const value = decryptSecret(
          secret.encryptedValue,
          secret.iv,
          secret.authTag,
        );
        // Override team secret if exists
        resolved.set(secret.name, {
          name: secret.name,
          value,
          source: "project",
          description: secret.description,
        });
      } catch (error) {
        console.error("Failed to decrypt project secret", {
          secretName: secret.name,
          teamId,
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const secret of envSecrets) {
      try {
        const value = decryptSecret(
          secret.encryptedValue,
          secret.iv,
          secret.authTag,
        );
        // Override project and team secrets if exists
        resolved.set(secret.name, {
          name: secret.name,
          value,
          source: "environment",
          description: secret.description,
        });
      } catch (error) {
        console.error("Failed to decrypt environment secret", {
          secretName: secret.name,
          teamId,
          projectId,
          environmentId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log("Resolved secrets for environment", {
      teamId,
      projectId,
      environmentId,
      totalSecrets: resolved.size,
      teamCount: teamSecrets.length,
      projectCount: projectSecrets.length,
      environmentCount: envSecrets.length,
    });

    return resolved;
  } catch (error) {
    console.error("Failed to resolve secrets for environment", {
      teamId,
      projectId,
      environmentId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get secrets for a specific scope
 *
 * @param scope - Secret scope (team, project, or environment)
 * @returns Array of secrets (with encrypted values)
 */
export async function getSecretsForScope(scope: SecretScope) {
  const conditions = [eq(secrets.teamId, scope.teamId)];

  if (scope.level === "team") {
    conditions.push(isNull(secrets.projectId));
    conditions.push(isNull(secrets.environmentId));
  } else if (scope.level === "project") {
    conditions.push(eq(secrets.projectId, scope.projectId));
    conditions.push(isNull(secrets.environmentId));
  } else if (scope.level === "environment") {
    conditions.push(eq(secrets.projectId, scope.projectId));
    conditions.push(eq(secrets.environmentId, scope.environmentId));
  }

  return db
    .select()
    .from(secrets)
    .where(and(...conditions));
}

/**
 * Create a new secret
 *
 * @param scope - Secret scope
 * @param name - Secret name
 * @param value - Secret value (plain text, will be encrypted)
 * @param description - Optional description
 * @param createdBy - User ID creating the secret
 * @returns Created secret record
 */
export async function createSecret(
  scope: SecretScope,
  name: string,
  value: string,
  description: string | undefined,
  createdBy: string,
) {
  const { encryptedData, iv, authTag } = encryptSecret(value);

  const secretData = {
    teamId: scope.teamId,
    projectId:
      scope.level === "project" || scope.level === "environment"
        ? scope.projectId
        : null,
    environmentId: scope.level === "environment" ? scope.environmentId : null,
    name,
    encryptedValue: encryptedData,
    iv,
    authTag,
    description: description || null,
    createdBy,
  };

  const [created] = await db.insert(secrets).values(secretData).returning();

  console.log("secret-created", {
    secretName: name,
    scope: scope.level,
    teamId: scope.teamId,
    projectId: "projectId" in scope ? scope.projectId : undefined,
    environmentId: "environmentId" in scope ? scope.environmentId : undefined,
    createdBy,
  });

  return created;
}

/**
 * Update an existing secret
 *
 * @param scope - Secret scope
 * @param name - Secret name
 * @param value - New secret value (optional)
 * @param description - New description (optional)
 * @param updatedBy - User ID updating the secret
 * @returns Updated secret record
 */
export async function updateSecret(
  scope: SecretScope,
  name: string,
  value: string | undefined,
  description: string | undefined,
  updatedBy: string,
) {
  const updateData: {
    encryptedValue?: string;
    iv?: string;
    authTag?: string;
    description?: string | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (value !== undefined) {
    const { encryptedData, iv, authTag } = encryptSecret(value);
    updateData.encryptedValue = encryptedData;
    updateData.iv = iv;
    updateData.authTag = authTag;
  }

  if (description !== undefined) {
    updateData.description = description || null;
  }

  const conditions = [eq(secrets.teamId, scope.teamId), eq(secrets.name, name)];

  if (scope.level === "team") {
    conditions.push(isNull(secrets.projectId));
    conditions.push(isNull(secrets.environmentId));
  } else if (scope.level === "project") {
    conditions.push(eq(secrets.projectId, scope.projectId));
    conditions.push(isNull(secrets.environmentId));
  } else if (scope.level === "environment") {
    conditions.push(eq(secrets.projectId, scope.projectId));
    conditions.push(eq(secrets.environmentId, scope.environmentId));
  }

  const [updated] = await db
    .update(secrets)
    .set(updateData)
    .where(and(...conditions))
    .returning();

  if (!updated) {
    throw new Error("Secret not found");
  }

  console.log("secret-updated", {
    secretName: name,
    scope: scope.level,
    teamId: scope.teamId,
    projectId: "projectId" in scope ? scope.projectId : undefined,
    environmentId: "environmentId" in scope ? scope.environmentId : undefined,
    updatedBy,
    valueChanged: value !== undefined,
  });

  return updated;
}

/**
 * Delete a secret
 *
 * @param scope - Secret scope
 * @param name - Secret name
 * @param deletedBy - User ID deleting the secret
 */
export async function deleteSecret(
  scope: SecretScope,
  name: string,
  deletedBy: string,
) {
  const conditions = [eq(secrets.teamId, scope.teamId), eq(secrets.name, name)];

  if (scope.level === "team") {
    conditions.push(isNull(secrets.projectId));
    conditions.push(isNull(secrets.environmentId));
  } else if (scope.level === "project") {
    conditions.push(eq(secrets.projectId, scope.projectId));
    conditions.push(isNull(secrets.environmentId));
  } else if (scope.level === "environment") {
    conditions.push(eq(secrets.projectId, scope.projectId));
    conditions.push(eq(secrets.environmentId, scope.environmentId));
  }

  const [deleted] = await db
    .delete(secrets)
    .where(and(...conditions))
    .returning();

  if (!deleted) {
    throw new Error("Secret not found");
  }

  console.log("secret-deleted", {
    secretName: name,
    scope: scope.level,
    teamId: scope.teamId,
    projectId: "projectId" in scope ? scope.projectId : undefined,
    environmentId: "environmentId" in scope ? scope.environmentId : undefined,
    deletedBy,
  });

  return deleted;
}
