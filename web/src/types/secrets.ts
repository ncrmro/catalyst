/**
 * Secret Management Types
 *
 * Three-tier secret management system (Team → Project → Environment).
 * Secrets inherit with precedence: Environment > Project > Team.
 */

import type { secrets } from "@/db/schema";

/**
 * Secret scope levels
 */
export type SecretScope =
  | { level: "team"; teamId: string }
  | { level: "project"; teamId: string; projectId: string }
  | {
      level: "environment";
      teamId: string;
      projectId: string;
      environmentId: string;
    };

/**
 * Secret record from database (includes encrypted value)
 */
export type Secret = typeof secrets.$inferSelect;

/**
 * Resolved secret with decrypted value and source information
 */
export type ResolvedSecret = {
  name: string;
  value: string;
  source: "team" | "project" | "environment";
  description?: string | null;
};

/**
 * Input for creating a new secret
 */
export type CreateSecretInput = {
  name: string;
  value: string;
  description?: string;
};

/**
 * Input for updating an existing secret
 */
export type UpdateSecretInput = {
  value?: string;
  description?: string;
};

/**
 * Secret with masked value for display purposes
 */
export type MaskedSecret = {
  name: string;
  description?: string | null;
  source: "team" | "project" | "environment";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};
