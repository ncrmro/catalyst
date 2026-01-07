import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * Connection Tokens Table (SQLite)
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
export const connectionTokens = sqliteTable(
  "connection_tokens",
  {
    userId: text("user_id").notNull(),
    providerId: text("provider_id").notNull(),

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
    // Store as timestamp number or ISO string depending on preference (drizzle 'integer' with mode 'timestamp' is standard for SQLite)
    tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
    tokenScope: text("token_scope"),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(new Date()),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.providerId] }),
    userIdIdx: index("connection_tokens_user_id_idx").on(table.userId),
  }),
);
