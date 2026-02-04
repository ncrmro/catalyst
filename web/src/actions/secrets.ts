"use server";

/**
 * Secret Management Actions Layer
 *
 * Server actions for managing secrets at team, project, and environment levels.
 * This layer handles authentication, authorization, and delegates to models.
 *
 * Authorization rules (per FR-ENV-038):
 * - Team secrets: Only team owners and admins
 * - Project secrets: Team owners, admins, and project members
 * - Environment secrets: Team owners, admins, and project members
 */

import { auth } from "@/auth";
import { isUserTeamAdminOrOwner, isUserTeamMember } from "@/lib/team-auth";
import {
  getSecretsForScope,
  createSecret as createSecretModel,
  updateSecret as updateSecretModel,
  deleteSecret as deleteSecretModel,
  decryptSecret,
} from "@/models/secrets";
import type {
  SecretScope,
  CreateSecretInput,
  UpdateSecretInput,
  MaskedSecret,
} from "@/types/secrets";
import {
  createSecretInputSchema,
  updateSecretInputSchema,
} from "@/schemas/secrets";

/**
 * Standard action result type
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * List secrets for a specific scope
 *
 * Returns secrets with masked values for display purposes.
 * Authorization: User must be a team member.
 */
export async function listSecrets(
  scope: SecretScope,
): Promise<ActionResult<MaskedSecret[]>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify user is a team member
  const isMember = await isUserTeamMember(scope.teamId);
  if (!isMember) {
    return { success: false, error: "Not authorized to view team secrets" };
  }

  try {
    const secrets = await getSecretsForScope(scope);

    // Convert to masked secrets for display
    const maskedSecrets: MaskedSecret[] = secrets.map((secret) => ({
      name: secret.name,
      description: secret.description,
      source: scope.level,
      createdBy: secret.createdBy,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
    }));

    return { success: true, data: maskedSecrets };
  } catch (error) {
    console.error("Failed to list secrets:", error);
    return {
      success: false,
      error: "Failed to list secrets",
    };
  }
}

/**
 * Create a new secret
 *
 * Authorization:
 * - Team secrets: Only team owners and admins
 * - Project/Environment secrets: Team owners, admins, and project members
 *
 * Returns the created secret with the decrypted value (for confirmation).
 */
export async function createSecret(
  scope: SecretScope,
  input: CreateSecretInput,
): Promise<
  ActionResult<{ name: string; value: string; description?: string | null }>
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  const validationResult = createSecretInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.errors[0]?.message || "Invalid input",
    };
  }

  // Authorization check
  if (scope.level === "team") {
    // Team secrets: Only owners and admins
    const isAdminOrOwner = await isUserTeamAdminOrOwner(scope.teamId);
    if (!isAdminOrOwner) {
      return {
        success: false,
        error: "Only team owners and admins can manage team secrets",
      };
    }
  } else {
    // Project/Environment secrets: Team owners, admins, and project members
    const isMember = await isUserTeamMember(scope.teamId);
    if (!isMember) {
      return {
        success: false,
        error: "Not authorized to manage project secrets",
      };
    }
  }

  try {
    const created = await createSecretModel(
      scope,
      input.name,
      input.value,
      input.description,
      session.user.id,
    );

    // Return decrypted value for confirmation (per FR-ENV-036)
    const value = decryptSecret(created.encryptedValue, created.iv, created.authTag);

    return {
      success: true,
      data: {
        name: created.name,
        value,
        description: created.description,
      },
    };
  } catch (error) {
    console.error("Failed to create secret:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create secret",
    };
  }
}

/**
 * Update an existing secret
 *
 * Authorization: Same as create (based on scope level).
 */
export async function updateSecret(
  scope: SecretScope,
  name: string,
  input: UpdateSecretInput,
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  const validationResult = updateSecretInputSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      error: validationResult.error.errors[0]?.message || "Invalid input",
    };
  }

  // Authorization check
  if (scope.level === "team") {
    const isAdminOrOwner = await isUserTeamAdminOrOwner(scope.teamId);
    if (!isAdminOrOwner) {
      return {
        success: false,
        error: "Only team owners and admins can manage team secrets",
      };
    }
  } else {
    const isMember = await isUserTeamMember(scope.teamId);
    if (!isMember) {
      return {
        success: false,
        error: "Not authorized to manage project secrets",
      };
    }
  }

  try {
    await updateSecretModel(
      scope,
      name,
      input.value,
      input.description,
      session.user.id,
    );

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Failed to update secret:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update secret",
    };
  }
}

/**
 * Delete a secret
 *
 * Authorization: Same as create (based on scope level).
 */
export async function deleteSecret(
  scope: SecretScope,
  name: string,
): Promise<ActionResult<{ success: true }>> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Authorization check
  if (scope.level === "team") {
    const isAdminOrOwner = await isUserTeamAdminOrOwner(scope.teamId);
    if (!isAdminOrOwner) {
      return {
        success: false,
        error: "Only team owners and admins can manage team secrets",
      };
    }
  } else {
    const isMember = await isUserTeamMember(scope.teamId);
    if (!isMember) {
      return {
        success: false,
        error: "Not authorized to manage project secrets",
      };
    }
  }

  try {
    await deleteSecretModel(scope, name, session.user.id);
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Failed to delete secret:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete secret",
    };
  }
}
