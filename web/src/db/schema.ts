import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import type { AdapterAccountType } from "@auth/core/adapters"
 
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  admin: boolean("admin").notNull().default(false),
})

export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  authenticators: many(authenticators),
  ownedTeams: many(teams, { relationName: "teamOwner" }),
  teamMemberships: many(teamsMemberships),
  githubToken: one(githubUserTokens, {
    fields: [users.id],
    references: [githubUserTokens.userId],
  }),
}))
 
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
)

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  })
}))
 
export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}))
 
export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    {
      compositePk: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ]
)
 
export const authenticators = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ]
)

export const authenticatorsRelations = relations(authenticators, ({ one }) => ({
  user: one(users, {
    fields: [authenticators.userId],
    references: [users.id]
  })
}))

export const teams = pgTable("teams", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("ownerId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
    relationName: "teamOwner"
  }),
  memberships: many(teamsMemberships),
  repos: many(repos),
  projects: many(projects)
}))

export const teamsMemberships = pgTable("teams_memberships", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  teamId: text("teamId")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // 'owner', 'admin', 'member'
  createdAt: timestamp("createdAt", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const teamsMembershipsRelations = relations(teamsMemberships, ({ one }) => ({
  team: one(teams, {
    fields: [teamsMemberships.teamId],
    references: [teams.id]
  }),
  user: one(users, {
    fields: [teamsMemberships.userId],
    references: [users.id]
  })
}))

export const repos = pgTable("repo", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  githubId: integer("github_id").notNull().unique(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
  language: text("language"),
  stargazersCount: integer("stargazers_count").notNull().default(0),
  forksCount: integer("forks_count").notNull().default(0),
  openIssuesCount: integer("open_issues_count").notNull().default(0),
  ownerLogin: text("owner_login").notNull(),
  ownerType: text("owner_type").notNull(), // 'User' | 'Organization'
  ownerAvatarUrl: text("owner_avatar_url"),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  pushedAt: timestamp("pushed_at", { mode: "date" }),
})

export const reposRelations = relations(repos, ({ one, many }) => ({
  team: one(teams, {
    fields: [repos.teamId],
    references: [teams.id]
  }),
  projectConnections: many(projectsRepos),
  environments: many(projectEnvironments),
  manifests: many(projectManifests),
  pullRequests: many(pullRequests)
}))

export const projects = pgTable("project", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  description: text("description"),
  ownerLogin: text("owner_login").notNull(),
  ownerType: text("owner_type").notNull(), // 'User' | 'Organization'
  ownerAvatarUrl: text("owner_avatar_url"),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  previewEnvironmentsCount: integer("preview_environments_count").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => {
  return {
    // Make full_name unique per team, not globally
    uniqueFullNamePerTeam: uniqueIndex("project_full_name_team_id_unique").on(table.fullName, table.teamId)
  }
})

export const projectsRelations = relations(projects, ({ one, many }) => ({
  team: one(teams, {
    fields: [projects.teamId],
    references: [teams.id]
  }),
  repositories: many(projectsRepos),
  environments: many(projectEnvironments),
  manifests: many(projectManifests)
}))

export const projectsRepos = pgTable(
  "projects_repos",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repoId: text("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (projectsRepos) => [
    {
      pk: primaryKey({
        columns: [projectsRepos.projectId, projectsRepos.repoId],
      }),
    },
  ]
)

export const projectsReposRelations = relations(projectsRepos, ({ one }) => ({
  project: one(projects, {
    fields: [projectsRepos.projectId],
    references: [projects.id]
  }),
  repo: one(repos, {
    fields: [projectsRepos.repoId],
    references: [repos.id]
  })
}))

export const projectEnvironments = pgTable(
  "project_environments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repoId: text("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    environment: text("environment").notNull(),
    latestDeployment: text("latest_deployment"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (projectEnvironments) => [
    {
      uniqueComposite: unique().on(
        projectEnvironments.projectId,
        projectEnvironments.repoId,
        projectEnvironments.environment
      ),
    },
  ]
)

export const projectEnvironmentsRelations = relations(projectEnvironments, ({ one }) => ({
  project: one(projects, {
    fields: [projectEnvironments.projectId],
    references: [projects.id]
  }),
  repo: one(repos, {
    fields: [projectEnvironments.repoId],
    references: [repos.id]
  })
}))

/**
 * Project Manifests Table
 * 
 * Tracks manifest files within repositories that provide hints about project type
 * and deployment configuration. The `path` field points to a specific file somewhere
 * in the repository that indicates how the project should be set up for development
 * and deployment environments.
 * 
 * Projects can have multiple manifests, each providing different deployment hints:
 * - Dockerfile: Indicates containerization capabilities
 * - Chart.yaml: Kubernetes Helm package configuration
 * - package.json: JavaScript/Node.js package configuration
 * - Cargo.toml: Rust package configuration
 * - Project.toml: Python/Julia package configuration  
 * - Gemfile: Ruby/Rails package configuration
 * 
 * These manifest files help the system automatically detect project types and
 * suggest appropriate deployment strategies when users haven't explicitly
 * configured deployment settings.
 */
export const projectManifests = pgTable(
  "project_manifests",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repoId: text("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.repoId, table.path]}),
  ]
)

export const projectManifestsRelations = relations(projectManifests, ({ one }) => ({
  project: one(projects, {
    fields: [projectManifests.projectId],
    references: [projects.id]
  }),
  repo: one(repos, {
    fields: [projectManifests.repoId],
    references: [repos.id]
  })
}))

/**
 * GitHub App User Tokens Table
 * 
 * Stores encrypted GitHub App user tokens with refresh capabilities.
 * This table enables secure token management for GitHub App authentication
 * with automatic refresh before expiration (8-hour tokens, 6-month refresh tokens).
 */
export const githubUserTokens = pgTable('github_user_tokens', {
  userId: text('user_id')
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .primaryKey(),
  installationId: text('installation_id'),
  accessTokenEncrypted: text('access_token_encrypted'),
  accessTokenIv: text('access_token_iv'),
  accessTokenAuthTag: text('access_token_auth_tag'),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  refreshTokenIv: text('refresh_token_iv'),
  refreshTokenAuthTag: text('refresh_token_auth_tag'),
  tokenExpiresAt: timestamp('token_expires_at'),
  tokenScope: text('token_scope'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const githubUserTokensRelations = relations(githubUserTokens, ({ one }) => ({
  user: one(users, {
    fields: [githubUserTokens.userId],
    references: [users.id]
  })
}))

/**
 * Pull Requests Table
 * 
 * Stores pull request information from various git providers (GitHub, GitLab, etc.).
 * Designed to be provider-agnostic while maintaining relationships with repositories.
 * 
 * This table tracks pull requests across different git providers and enables
 * consistent reporting and management regardless of the underlying provider.
 */
export const pullRequests = pgTable(
  "pull_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    repoId: text("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'github', 'gitlab', 'gitea', etc.
    providerPrId: text("provider_pr_id").notNull(), // PR ID from the provider
    number: integer("number").notNull(), // PR number (usually different from ID)
    title: text("title").notNull(),
    description: text("description"), // PR body/description
    state: text("state").notNull(), // 'open', 'closed', 'merged'
    status: text("status").notNull(), // 'draft', 'ready', 'changes_requested'
    url: text("url").notNull(),
    authorLogin: text("author_login").notNull(),
    authorAvatarUrl: text("author_avatar_url"),
    headBranch: text("head_branch").notNull(),
    baseBranch: text("base_branch").notNull(),
    commentsCount: integer("comments_count").notNull().default(0),
    reviewsCount: integer("reviews_count").notNull().default(0),
    changedFilesCount: integer("changed_files_count").notNull().default(0),
    additionsCount: integer("additions_count").notNull().default(0),
    deletionsCount: integer("deletions_count").notNull().default(0),
    priority: text("priority").notNull().default('medium'), // 'high', 'medium', 'low'
    labels: text("labels"), // JSON array of labels
    assignees: text("assignees"), // JSON array of assignees
    reviewers: text("reviewers"), // JSON array of reviewers
    mergedAt: timestamp("merged_at", { mode: "date" }),
    closedAt: timestamp("closed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // Ensure unique PR per provider per repo
    unique().on(table.repoId, table.provider, table.providerPrId),
  ]
)

export const pullRequestsRelations = relations(pullRequests, ({ one }) => ({
  repo: one(repos, {
    fields: [pullRequests.repoId],
    references: [repos.id]
  })
}))