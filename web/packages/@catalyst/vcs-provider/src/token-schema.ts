/**
 * Provider-Agnostic VCS Token Schema
 * 
 * This file provides a reference schema definition for storing VCS provider tokens
 * in a database. It can be used with any ORM (Drizzle, Prisma, TypeORM, etc.) by
 * adapting the types to the specific ORM's syntax.
 * 
 * FEATURES:
 * - Provider-agnostic design (supports multiple VCS providers)
 * - Secure token encryption fields (separate IV and auth tag)
 * - Expiration tracking
 * - Installation/org tracking per provider
 * - Audit timestamps
 * 
 * USAGE:
 * This schema can be adapted to your ORM of choice. Examples:
 * 
 * 1. Drizzle ORM (PostgreSQL):
 * ```typescript
 * import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
 * 
 * export const vcsProviderTokens = pgTable("vcs_provider_tokens", {
 *   userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
 *   providerId: text("provider_id").notNull(),
 *   installationId: text("installation_id"),
 *   accessTokenEncrypted: text("access_token_encrypted"),
 *   accessTokenIv: text("access_token_iv"),
 *   accessTokenAuthTag: text("access_token_auth_tag"),
 *   refreshTokenEncrypted: text("refresh_token_encrypted"),
 *   refreshTokenIv: text("refresh_token_iv"),
 *   refreshTokenAuthTag: text("refresh_token_auth_tag"),
 *   tokenExpiresAt: timestamp("token_expires_at"),
 *   tokenScope: text("token_scope"),
 *   createdAt: timestamp("created_at").defaultNow().notNull(),
 *   updatedAt: timestamp("updated_at").defaultNow().notNull(),
 * }, (table) => ({
 *   pk: primaryKey({ columns: [table.userId, table.providerId] })
 * }));
 * ```
 * 
 * 2. Prisma:
 * ```prisma
 * model VcsProviderToken {
 *   userId                  String
 *   providerId              String
 *   installationId          String?
 *   accessTokenEncrypted    String?
 *   accessTokenIv           String?
 *   accessTokenAuthTag      String?
 *   refreshTokenEncrypted   String?
 *   refreshTokenIv          String?
 *   refreshTokenAuthTag     String?
 *   tokenExpiresAt          DateTime?
 *   tokenScope              String?
 *   createdAt               DateTime  @default(now())
 *   updatedAt               DateTime  @updatedAt
 *   
 *   user                    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
 *   
 *   @@id([userId, providerId])
 *   @@map("vcs_provider_tokens")
 * }
 * ```
 * 
 * 3. TypeORM:
 * ```typescript
 * @Entity('vcs_provider_tokens')
 * export class VcsProviderToken {
 *   @PrimaryColumn()
 *   userId: string;
 *   
 *   @PrimaryColumn()
 *   providerId: string;
 *   
 *   @Column({ nullable: true })
 *   installationId?: string;
 *   
 *   @Column({ nullable: true })
 *   accessTokenEncrypted?: string;
 *   
 *   @Column({ nullable: true })
 *   accessTokenIv?: string;
 *   
 *   @Column({ nullable: true })
 *   accessTokenAuthTag?: string;
 *   
 *   @Column({ nullable: true })
 *   refreshTokenEncrypted?: string;
 *   
 *   @Column({ nullable: true })
 *   refreshTokenIv?: string;
 *   
 *   @Column({ nullable: true })
 *   refreshTokenAuthTag?: string;
 *   
 *   @Column({ nullable: true })
 *   tokenExpiresAt?: Date;
 *   
 *   @Column({ nullable: true })
 *   tokenScope?: string;
 *   
 *   @CreateDateColumn()
 *   createdAt: Date;
 *   
 *   @UpdateDateColumn()
 *   updatedAt: Date;
 *   
 *   @ManyToOne(() => User, { onDelete: 'CASCADE' })
 *   @JoinColumn({ name: 'userId' })
 *   user: User;
 * }
 * ```
 */

import type { ProviderId } from "./types";

/**
 * Token encryption result
 * 
 * Tokens should be encrypted using AES-256-GCM encryption before storage.
 * This interface represents the encrypted token parts.
 */
export interface EncryptedTokenParts {
  /** The encrypted token data (hex string) */
  encryptedData: string;
  /** Initialization vector (hex string) */
  iv: string;
  /** Authentication tag for GCM mode (hex string) */
  authTag: string;
}

/**
 * VCS Provider Token Record
 * 
 * Represents a stored VCS provider token in the database.
 * This is the TypeScript representation of the database schema.
 */
export interface VCSProviderTokenRecord {
  /** User ID (foreign key to users table) */
  userId: string;

  /** VCS provider ID (github, gitlab, bitbucket, azure) */
  providerId: ProviderId;

  /** 
   * Provider-specific installation/organization ID
   * For GitHub: GitHub App installation ID
   * For GitLab: GitLab group/project ID
   * For Bitbucket: Workspace ID
   * For Azure DevOps: Organization ID
   */
  installationId?: string | null;

  /** Encrypted access token (hex string) */
  accessTokenEncrypted?: string | null;

  /** Access token initialization vector (hex string) */
  accessTokenIv?: string | null;

  /** Access token authentication tag (hex string) */
  accessTokenAuthTag?: string | null;

  /** Encrypted refresh token (hex string) */
  refreshTokenEncrypted?: string | null;

  /** Refresh token initialization vector (hex string) */
  refreshTokenIv?: string | null;

  /** Refresh token authentication tag (hex string) */
  refreshTokenAuthTag?: string | null;

  /** Token expiration timestamp */
  tokenExpiresAt?: Date | null;

  /** OAuth scopes/permissions granted */
  tokenScope?: string | null;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * Schema field definitions for documentation
 * 
 * This provides a language-agnostic description of each field
 * that can be used to generate schema definitions in any ORM.
 */
export const VCS_PROVIDER_TOKEN_SCHEMA = {
  tableName: "vcs_provider_tokens",
  fields: {
    userId: {
      type: "text" as const,
      nullable: false,
      primaryKey: true,
      foreignKey: {
        table: "users",
        column: "id",
        onDelete: "CASCADE",
      },
      description: "User ID owning these tokens",
    },
    providerId: {
      type: "text" as const,
      nullable: false,
      primaryKey: true,
      description: "VCS provider identifier (github, gitlab, bitbucket, azure)",
    },
    installationId: {
      type: "text" as const,
      nullable: true,
      description:
        "Provider-specific installation/organization ID (e.g., GitHub App installation ID)",
    },
    accessTokenEncrypted: {
      type: "text" as const,
      nullable: true,
      description: "Encrypted access token (AES-256-GCM encrypted, hex string)",
    },
    accessTokenIv: {
      type: "text" as const,
      nullable: true,
      description: "Initialization vector for access token encryption (hex string)",
    },
    accessTokenAuthTag: {
      type: "text" as const,
      nullable: true,
      description:
        "Authentication tag for access token encryption (GCM mode, hex string)",
    },
    refreshTokenEncrypted: {
      type: "text" as const,
      nullable: true,
      description: "Encrypted refresh token (AES-256-GCM encrypted, hex string)",
    },
    refreshTokenIv: {
      type: "text" as const,
      nullable: true,
      description:
        "Initialization vector for refresh token encryption (hex string)",
    },
    refreshTokenAuthTag: {
      type: "text" as const,
      nullable: true,
      description:
        "Authentication tag for refresh token encryption (GCM mode, hex string)",
    },
    tokenExpiresAt: {
      type: "timestamp" as const,
      nullable: true,
      description: "Access token expiration timestamp",
    },
    tokenScope: {
      type: "text" as const,
      nullable: true,
      description: "OAuth scopes/permissions granted to the token",
    },
    createdAt: {
      type: "timestamp" as const,
      nullable: false,
      default: "now()",
      description: "Record creation timestamp",
    },
    updatedAt: {
      type: "timestamp" as const,
      nullable: false,
      default: "now()",
      description: "Record last update timestamp",
    },
  },
  indexes: [
    {
      name: "vcs_provider_tokens_user_id_idx",
      columns: ["userId"],
      description: "Index for efficient user token lookups",
    },
  ],
  constraints: [
    {
      type: "PRIMARY_KEY" as const,
      columns: ["userId", "providerId"],
      description: "Composite primary key - one token set per user per provider",
    },
  ],
} as const;

/**
 * Migration SQL for PostgreSQL
 * 
 * This SQL can be used as a reference for creating the table manually
 * or in a migration file.
 */
export const POSTGRES_MIGRATION_SQL = `
-- Create VCS provider tokens table
CREATE TABLE IF NOT EXISTS vcs_provider_tokens (
  user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  installation_id TEXT,
  access_token_encrypted TEXT,
  access_token_iv TEXT,
  access_token_auth_tag TEXT,
  refresh_token_encrypted TEXT,
  refresh_token_iv TEXT,
  refresh_token_auth_tag TEXT,
  token_expires_at TIMESTAMP,
  token_scope TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, provider_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for efficient user lookups
CREATE INDEX IF NOT EXISTS vcs_provider_tokens_user_id_idx 
ON vcs_provider_tokens(user_id);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vcs_provider_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vcs_provider_tokens_updated_at
BEFORE UPDATE ON vcs_provider_tokens
FOR EACH ROW
EXECUTE FUNCTION update_vcs_provider_tokens_updated_at();
`;

/**
 * Example: Convert GitHub-specific tokens to provider-agnostic format
 * 
 * This helper can be used to migrate from GitHub-specific token storage
 * to the provider-agnostic schema.
 */
export function migrateGitHubTokensToVCSTokens(
  githubTokenRecord: {
    userId: string;
    installationId?: string | null;
    accessTokenEncrypted?: string | null;
    accessTokenIv?: string | null;
    accessTokenAuthTag?: string | null;
    refreshTokenEncrypted?: string | null;
    refreshTokenIv?: string | null;
    refreshTokenAuthTag?: string | null;
    tokenExpiresAt?: Date | null;
    tokenScope?: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
): VCSProviderTokenRecord {
  return {
    ...githubTokenRecord,
    providerId: "github",
  };
}
