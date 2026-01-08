import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

/**
 * Connection Tokens Table (PostgreSQL)
 *
 * Stores encrypted authentication tokens for external services (VCS providers, etc.).
 * Designed to be provider-agnostic.
 *
 * Usage:
 * - `userId`: The internal application user ID
 * - `providerId`: Service identifier (e.g., 'github', 'slack', 'linear')
 * - `resourceId`: Optional scope/context identifier (e.g., GitHub App Installation ID, Slack Workspace ID)
 * - `accessToken*`: Encrypted access token parts
 * - `refreshToken*`: Encrypted refresh token parts
 */
export const connectionTokens = pgTable(
  "connection_tokens",
  {
    userId: text("user_id").notNull(), // Foreign key should be handled by app-level relations if strictness is needed
    providerId: text("provider_id").notNull(), // e.g. "github", "gitlab", "slack"

    // Generic resource identifier for the provider context
    // GitHub -> Installation ID
    // Slack -> Workspace ID
    // Linear -> Organization ID
    resourceId: text("resource_id"),

    // Encrypted Access Token
    accessTokenEncrypted: text("access_token_encrypted"),
    accessTokenIv: text("access_token_iv"),
    accessTokenAuthTag: text("access_token_auth_tag"),

    // Encrypted Refresh Token
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    refreshTokenIv: text("refresh_token_iv"),
    refreshTokenAuthTag: text("refresh_token_auth_tag"),

    // Token Metadata
    tokenExpiresAt: timestamp("token_expires_at"),
    tokenScope: text("token_scope"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.providerId] }),
    userIdIdx: index("connection_tokens_user_id_idx").on(table.userId),
  }),
);
