import { pgTable, text, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { sqliteTable, text as textSqlite, integer, primaryKey as primaryKeySqlite, index as indexSqlite } from "drizzle-orm/sqlite-core";

/**
 * VCS Provider Tokens Schema (PostgreSQL)
 * 
 * Recommended usage:
 * import { vcsProviderTokensPg } from "@catalyst/vcs-provider";
 */
export const vcsProviderTokensPg = pgTable("vcs_provider_tokens", {
  userId: text("user_id").notNull(), // Foreign key relation should be defined in the application
  providerId: text("provider_id").notNull(), // github, gitlab, etc.
  
  // Provider specific metadata
  installationId: text("installation_id"), // GitHub App Installation ID
  
  // Encrypted tokens
  accessTokenEncrypted: text("access_token_encrypted"),
  accessTokenIv: text("access_token_iv"),
  accessTokenAuthTag: text("access_token_auth_tag"),
  
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  refreshTokenIv: text("refresh_token_iv"),
  refreshTokenAuthTag: text("refresh_token_auth_tag"),
  
  // Token metadata
  tokenExpiresAt: timestamp("token_expires_at"),
  tokenScope: text("token_scope"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.providerId] }),
  userIdIdx: index("vcs_provider_tokens_user_id_idx").on(table.userId),
}));

/**
 * VCS Provider Tokens Schema (SQLite)
 * 
 * Recommended usage:
 * import { vcsProviderTokensSqlite } from "@catalyst/vcs-provider";
 */
export const vcsProviderTokensSqlite = sqliteTable("vcs_provider_tokens", {
  userId: textSqlite("user_id").notNull(),
  providerId: textSqlite("provider_id").notNull(),
  
  installationId: textSqlite("installation_id"),
  
  accessTokenEncrypted: textSqlite("access_token_encrypted"),
  accessTokenIv: textSqlite("access_token_iv"),
  accessTokenAuthTag: textSqlite("access_token_auth_tag"),
  
  refreshTokenEncrypted: textSqlite("refresh_token_encrypted"),
  refreshTokenIv: textSqlite("refresh_token_iv"),
  refreshTokenAuthTag: textSqlite("refresh_token_auth_tag"),
  
  // Store as ISO string or timestamp number
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }),
  tokenScope: textSqlite("token_scope"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(new Date()),
}, (table) => ({
  pk: primaryKeySqlite({ columns: [table.userId, table.providerId] }),
  userIdIdx: indexSqlite("vcs_provider_tokens_user_id_idx").on(table.userId),
}));

// Types for insertion and selection
export type VCSProviderTokenPg = typeof vcsProviderTokensPg.$inferSelect;
export type VCSProviderTokenPgInsert = typeof vcsProviderTokensPg.$inferInsert;

export type VCSProviderTokenSqlite = typeof vcsProviderTokensSqlite.$inferSelect;
export type VCSProviderTokenSqliteInsert = typeof vcsProviderTokensSqlite.$inferInsert;
