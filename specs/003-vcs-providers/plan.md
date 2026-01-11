# VCS Organization Team Integration - Implementation Plan

## Overview

This plan details the technical implementation of US-2: VCS Organization Team Integration. The implementation is **provider-agnostic**, supporting GitHub, GitLab, Gitea, Forgejo, and Bitbucket with the same interface and database schema.

## Architecture

### Three-Layer Design

**Layer 1: VCS Provider Interface** (`@catalyst/vcs-provider`)

- Add organization operations to `VCSProvider` interface
- New provider-agnostic types: `Organization`, `OrganizationMember`, `MembershipCheck`
- Implement in `GitHubProvider` first, then extend to other providers
- Normalize role mappings across providers

**Layer 2: Database & Models** (`web/src/db`, `web/src/models`)

- Extend `teams` table with VCS provider columns (supports multiple providers)
- Create team-org association functions
- Implement provider-specific webhook event handlers

**Layer 3: UI & Actions** (`web/src/actions`, `web/src/components`)

- Provider-aware detection during repository connection
- Show provider-specific confirmation dialogs
- Enforce access control in actions layer

## Database Schema

### Teams Table Extensions

```sql
ALTER TABLE teams ADD COLUMN vcs_provider_id TEXT;
ALTER TABLE teams ADD COLUMN vcs_org_id TEXT;
ALTER TABLE teams ADD COLUMN vcs_org_login TEXT;
ALTER TABLE teams ADD COLUMN vcs_org_avatar_url TEXT;
ALTER TABLE teams ADD COLUMN is_vcs_org BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE teams ADD COLUMN synced_at TIMESTAMP;

-- Composite unique constraint: one team per VCS org per provider
CREATE UNIQUE INDEX teams_vcs_org_unique
  ON teams(vcs_provider_id, vcs_org_id)
  WHERE vcs_provider_id IS NOT NULL AND vcs_org_id IS NOT NULL;

-- Index for lookups
CREATE INDEX idx_teams_vcs_org_login ON teams(vcs_provider_id, vcs_org_login);
```

**Schema Design Notes:**

- `vcs_provider_id`: Enum-like string ('github', 'gitlab', 'gitea', 'bitbucket')
- `vcs_org_id`: Provider-specific numeric or UUID identifier (stored as TEXT for flexibility)
- Composite unique constraint allows same org name on different providers
- Examples:
  - GitHub: `vcs_provider_id='github'`, `vcs_org_id='12345'`
  - GitLab: `vcs_provider_id='gitlab'`, `vcs_org_id='67890'`
  - Gitea: `vcs_provider_id='gitea'`, `vcs_org_id='42'`

### Migration File

**Location:** `web/src/db/migrations/YYYYMMDDHHMMSS_add_vcs_org_to_teams.ts`

```typescript
import { sql } from "drizzle-orm";
import { db } from "../index";

export async function up() {
  await db.execute(sql`
    ALTER TABLE teams
      ADD COLUMN vcs_provider_id TEXT,
      ADD COLUMN vcs_org_id TEXT,
      ADD COLUMN vcs_org_login TEXT,
      ADD COLUMN vcs_org_avatar_url TEXT,
      ADD COLUMN is_vcs_org BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN synced_at TIMESTAMP;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX teams_vcs_org_unique
      ON teams(vcs_provider_id, vcs_org_id)
      WHERE vcs_provider_id IS NOT NULL AND vcs_org_id IS NOT NULL;
  `);

  await db.execute(sql`
    CREATE INDEX idx_teams_vcs_org_login
      ON teams(vcs_provider_id, vcs_org_login);
  `);
}

export async function down() {
  await db.execute(sql`DROP INDEX IF EXISTS idx_teams_vcs_org_login;`);
  await db.execute(sql`DROP INDEX IF EXISTS teams_vcs_org_unique;`);
  await db.execute(sql`
    ALTER TABLE teams
      DROP COLUMN vcs_provider_id,
      DROP COLUMN vcs_org_id,
      DROP COLUMN vcs_org_login,
      DROP COLUMN vcs_org_avatar_url,
      DROP COLUMN is_vcs_org,
      DROP COLUMN synced_at;
  `);
}
```

## VCS Provider Interface Extensions

### Type Definitions

**File:** `web/packages/@catalyst/vcs-provider/src/types.ts`

```typescript
// Organization entity (provider-agnostic)
export interface Organization {
  id: string; // Provider-specific ID (stringified)
  login: string; // org name/slug
  name?: string; // Display name
  description?: string;
  avatarUrl: string;
  url: string; // URL to org on provider
  type: "Organization"; // Constant marker
  membersCount?: number;
  reposCount?: number;
}

// Organization member
export interface OrganizationMember {
  id: string; // User ID in provider
  login: string; // Username
  name?: string;
  email?: string;
  avatarUrl: string;
  role: OrganizationRole; // Normalized role
  state?: "active" | "pending";
}

// Normalized roles across providers
export type OrganizationRole =
  | "owner" // Full admin (GitHub: owner, GitLab: owner)
  | "admin" // Admin (GitHub: admin, GitLab: maintainer)
  | "member"; // Regular member (GitHub: member, GitLab: developer)

// Membership check result
export interface MembershipCheck {
  isMember: boolean;
  role?: OrganizationRole;
  state?: "active" | "pending";
}
```

### VCSProvider Interface Extensions

**File:** `web/packages/@catalyst/vcs-provider/src/types.ts`

```typescript
export interface VCSProvider {
  // ... existing methods ...

  // Organization Operations
  getOrganization(
    client: AuthenticatedClient,
    org: string,
  ): Promise<Organization>;

  listOrganizationMembers(
    client: AuthenticatedClient,
    org: string,
    options?: {
      role?: OrganizationRole;
      state?: "active" | "pending" | "all";
    },
  ): Promise<OrganizationMember[]>;

  getMyOrganizationMembership(
    client: AuthenticatedClient,
    org: string,
  ): Promise<MembershipCheck>;
}
```

### VCSProviderSingleton Extensions

**File:** `web/packages/@catalyst/vcs-provider/src/vcs-provider.ts`

```typescript
export class VCSProviderSingleton {
  public readonly organizations: OrganizationOperations;

  private constructor() {
    // ... existing code ...
    this.organizations = new OrganizationOperations(this);
  }
}

class OrganizationOperations {
  constructor(private provider: VCSProviderSingleton) {}

  async get(
    tokenSourceId: string,
    providerId: ProviderId,
    org: string,
  ): Promise<Organization> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) => vcsProvider.getOrganization(client, org),
    );
  }

  async listMembers(
    tokenSourceId: string,
    providerId: ProviderId,
    org: string,
    options?: { role?: OrganizationRole; state?: "active" | "pending" | "all" },
  ): Promise<OrganizationMember[]> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) =>
        vcsProvider.listOrganizationMembers(client, org, options),
    );
  }

  async getMyMembership(
    tokenSourceId: string,
    providerId: ProviderId,
    org: string,
  ): Promise<MembershipCheck> {
    return this.provider.execute(
      tokenSourceId,
      providerId,
      (vcsProvider, client) =>
        vcsProvider.getMyOrganizationMembership(client, org),
    );
  }
}

// Extend ScopedVCSProvider
export class ScopedVCSProvider {
  public get organizations() {
    return {
      get: (org: string) =>
        this.provider.organizations.get(
          this.tokenSourceId,
          this.providerId,
          org,
        ),
      listMembers: (org: string, options?) =>
        this.provider.organizations.listMembers(
          this.tokenSourceId,
          this.providerId,
          org,
          options,
        ),
      getMyMembership: (org: string) =>
        this.provider.organizations.getMyMembership(
          this.tokenSourceId,
          this.providerId,
          org,
        ),
    };
  }
}
```

## Provider Implementations

### GitHub Implementation

**File:** `web/packages/@catalyst/vcs-provider/src/providers/github/provider.ts`

```typescript
export class GitHubProvider implements VCSProvider {
  async getOrganization(
    client: AuthenticatedClient,
    org: string,
  ): Promise<Organization> {
    const octokit = client.raw as Octokit;
    const { data } = await octokit.rest.orgs.get({ org });

    return {
      id: String(data.id),
      login: data.login,
      name: data.name || undefined,
      description: data.description || undefined,
      avatarUrl: data.avatar_url,
      url: data.html_url,
      type: "Organization",
      membersCount: data.public_members_count || undefined,
      reposCount: data.public_repos || undefined,
    };
  }

  async listOrganizationMembers(
    client: AuthenticatedClient,
    org: string,
    options?: { role?: OrganizationRole; state?: "active" | "pending" | "all" },
  ): Promise<OrganizationMember[]> {
    const octokit = client.raw as Octokit;

    // GitHub API expects 'admin' or 'member', not 'owner'
    const params: any = { org, per_page: 100 };
    if (options?.role === "admin" || options?.role === "owner") {
      params.role = "admin";
    } else if (options?.role === "member") {
      params.role = "member";
    }

    const { data: members } = await octokit.rest.orgs.listMembers(params);

    // Fetch detailed membership for each member to get exact role
    const detailedMembers = await Promise.all(
      members.map(async (member) => {
        try {
          const { data: membership } =
            await octokit.rest.orgs.getMembershipForUser({
              org,
              username: member.login,
            });

          return {
            id: String(member.id),
            login: member.login,
            avatarUrl: member.avatar_url,
            role: this.mapGitHubRoleToOrgRole(membership.role),
            state: membership.state as "active" | "pending",
          };
        } catch {
          // Fallback if can't get detailed membership
          return {
            id: String(member.id),
            login: member.login,
            avatarUrl: member.avatar_url,
            role: "member" as OrganizationRole,
            state: "active" as const,
          };
        }
      }),
    );

    // Filter by state
    if (options?.state && options.state !== "all") {
      return detailedMembers.filter((m) => m.state === options.state);
    }

    return detailedMembers;
  }

  async getMyOrganizationMembership(
    client: AuthenticatedClient,
    org: string,
  ): Promise<MembershipCheck> {
    const octokit = client.raw as Octokit;
    try {
      const { data } =
        await octokit.rest.orgs.getMembershipForAuthenticatedUser({ org });
      return {
        isMember: true,
        role: this.mapGitHubRoleToOrgRole(data.role),
        state: data.state as "active" | "pending",
      };
    } catch (error: any) {
      if (error.status === 404) {
        return { isMember: false };
      }
      throw error;
    }
  }

  private mapGitHubRoleToOrgRole(githubRole: string): OrganizationRole {
    // GitHub uses 'admin' for both owners and admins
    // We normalize to 'owner' for consistency
    switch (githubRole) {
      case "admin":
        return "owner"; // GitHub admins → platform owners
      case "member":
        return "member";
      default:
        return "member";
    }
  }
}
```

**Update OAuth Scopes:**

**File:** `web/packages/@catalyst/vcs-provider/src/providers/github/auth.ts`

```typescript
export function generateAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CONFIG.APP_CLIENT_ID,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/github`,
    scope: "read:user user:email read:org repo", // Added read:org
    response_type: "code",
  });
  // ...
}
```

### Future Provider Implementations

**GitLab:**

- `getOrganization()` → use `/groups/:id` API
- Map roles: owner → owner, maintainer → admin, developer → member

**Gitea/Forgejo:**

- `getOrganization()` → use `/orgs/:orgname` API
- Map roles: owner → owner, admin → admin, member → member

**Bitbucket:**

- `getOrganization()` → use `/workspaces/:workspace` API
- Map roles: admin → owner, member → member

## Models Layer

**File:** `web/src/models/teams.ts`

```typescript
import { db } from "@/db";
import { teams, teamsMemberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { ProviderId } from "@catalyst/vcs-provider";

/**
 * Find team by VCS provider and organization login
 */
export async function getTeamByVCSOrg(
  providerId: ProviderId,
  orgLogin: string,
) {
  const [team] = await db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.vcsProviderId, providerId),
        eq(teams.vcsOrgLogin, orgLogin)
      )
    )
    .limit(1);

  return team || null;
}

/**
 * Create team for VCS organization
 */
export async function createTeamForVCSOr g({
  providerId,
  orgId,
  orgLogin,
  orgAvatarUrl,
  userId,
}: {
  providerId: ProviderId;
  orgId: string;
  orgLogin: string;
  orgAvatarUrl: string;
  userId: string;
}) {
  const [newTeam] = await db.insert(teams).values({
    name: orgLogin,
    description: `VCS Organization: ${orgLogin}`,
    ownerId: userId,
    vcsProviderId: providerId,
    vcsOrgId: orgId,
    vcsOrgLogin: orgLogin,
    vcsOrgAvatarUrl: orgAvatarUrl,
    isVcsOrg: true,
    syncedAt: new Date(),
  }).returning();

  // Add creator as owner
  await db.insert(teamsMemberships).values({
    teamId: newTeam.id,
    userId: userId,
    role: "owner",
  });

  return newTeam;
}

/**
 * Sync team members from VCS organization
 */
export async function syncTeamMembersFromVCSOr g(
  teamId: string,
  providerId: ProviderId,
  orgLogin: string,
  userId: string,
) {
  const scopedVcs = vcs.getScoped(userId, providerId);

  // Fetch org members from VCS provider
  const orgMembers = await scopedVcs.organizations.listMembers(orgLogin, {
    state: 'active',
  });

  // Get existing team memberships
  const existing = await db
    .select()
    .from(teamsMemberships)
    .where(eq(teamsMemberships.teamId, teamId));

  const existingMap = new Map(existing.map((m) => [m.userId, m]));

  // Add new members
  for (const orgMember of orgMembers) {
    const catalystUser = await findOrCreateUserByVCSId(
      providerId,
      orgMember.id
    );

    if (!catalystUser) continue;

    if (!existingMap.has(catalystUser.id)) {
      await db.insert(teamsMemberships).values({
        teamId,
        userId: catalystUser.id,
        role: mapOrgRoleToTeamRole(orgMember.role),
      });
    }
  }

  // Remove members no longer in org
  const orgUserIds = new Set(
    (await Promise.all(
      orgMembers.map(m => findUserByVCSId(providerId, m.id))
    ))
    .filter(Boolean)
    .map(u => u!.id)
  );

  for (const [userId, membership] of existingMap) {
    if (!orgUserIds.has(userId) && membership.role !== 'owner') {
      await db.delete(teamsMemberships)
        .where(eq(teamsMemberships.id, membership.id));
    }
  }

  // Update sync timestamp
  await db.update(teams)
    .set({ syncedAt: new Date() })
    .where(eq(teams.id, teamId));
}

/**
 * Map VCS org role to team role
 */
function mapOrgRoleToTeamRole(orgRole: OrganizationRole): string {
  // 'owner' from VCS → 'admin' in team (never give 'owner' via sync)
  if (orgRole === 'owner') return 'admin';
  if (orgRole === 'admin') return 'admin';
  return 'member';
}

/**
 * Find user by VCS provider ID
 */
async function findUserByVCSId(
  providerId: ProviderId,
  vcsUserId: string,
): Promise<{ id: string } | null> {
  const account = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, providerId),
        eq(accounts.providerAccountId, vcsUserId)
      )
    )
    .limit(1);

  if (!account.length) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, account[0].userId))
    .limit(1);

  return user[0] || null;
}
```

## Webhook Handling

**File:** `web/src/app/api/github/webhook/route.ts`

```typescript
// Add to POST handler
switch (event) {
  case "installation":
    return await handleInstallationEvent(payload);
  case "pull_request":
    return await handlePullRequestEvent(payload);
  case "organization": // NEW
    return await handleOrganizationEvent(payload);
  default:
    console.log(`Unhandled event type: ${event}`);
    return NextResponse.json({ success: true });
}

/**
 * Handle GitHub organization membership events
 */
async function handleOrganizationEvent(payload: any) {
  const { action, organization, membership } = payload;

  if (action === 'member_added') {
    await handleMemberAdded(organization, membership);
  } else if (action === 'member_removed') {
    await handleMemberRemoved(organization, membership);
  } else if (action === 'deleted') {
    await handleOrgDeleted(organization);
  }

  return NextResponse.json({ success: true });
}

async function handleMemberAdded(org: any, membership: any) {
  // Find or create team
  let team = await getTeamByVCSOr g('github', org.login);

  if (!team) {
    // Webhook arrived before user created team - skip for now
    console.warn(`No team found for GitHub org ${org.login}, skipping member sync`);
    return;
  }

  // Find Catalyst user by GitHub ID
  const catalystUser = await findUserByVCSId('github', String(membership.user.id));

  if (!catalystUser) {
    console.warn(`User ${membership.user.login} not found in Catalyst, will sync on login`);
    return;
  }

  // Add/update membership
  await db.insert(teamsMemberships).values({
    teamId: team.id,
    userId: catalystUser.id,
    role: mapGitHubRoleToTeamRole(membership.role),
  }).onConflictDoUpdate({
    target: [teamsMemberships.teamId, teamsMemberships.userId],
    set: { role: mapGitHubRoleToTeamRole(membership.role) },
  });

  // Update sync timestamp
  await db.update(teams)
    .set({ syncedAt: new Date() })
    .where(eq(teams.id, team.id));
}

async function handleMemberRemoved(org: any, membership: any) {
  const team = await getTeamByVCSOr g('github', org.login);
  if (!team) return;

  const catalystUser = await findUserByVCSId('github', String(membership.user.id));
  if (!catalystUser) return;

  // Remove membership (but not if they're the owner)
  await db.delete(teamsMemberships)
    .where(
      and(
        eq(teamsMemberships.teamId, team.id),
        eq(teamsMemberships.userId, catalystUser.id),
        ne(teamsMemberships.role, 'owner') // Don't remove owner
      )
    );

  await db.update(teams)
    .set({ syncedAt: new Date() })
    .where(eq(teams.id, team.id));
}

async function handleOrgDeleted(org: any) {
  const team = await getTeamByVCSOr g('github', org.login);
  if (!team) return;

  // Soft delete: mark as deleted but preserve for audit
  await db.update(teams)
    .set({
      deletedAt: new Date(),
      syncedAt: new Date(),
    })
    .where(eq(teams.id, team.id));
}

function mapGitHubRoleToTeamRole(githubRole: string): string {
  return githubRole === 'admin' ? 'admin' : 'member';
}
```

## Action Layer

**File:** `web/src/actions/teams.ts`

```typescript
import { vcs } from "@/lib/vcs";
import { auth } from "@/auth";
import { getTeamByVCSOr g } from "@/models/teams";
import type { ProviderId } from "@catalyst/vcs-provider";

export async function checkOrgTeamStatus({
  providerId,
  ownerLogin,
  ownerType,
}: {
  providerId: ProviderId;
  ownerLogin: string;
  ownerType: string;
}) {
  if (ownerType !== "Organization") {
    return { teamExists: true };
  }

  // Check if team already exists
  const existingTeam = await getTeamByVCSOr g(providerId, ownerLogin);

  if (existingTeam) {
    return {
      teamExists: true,
      teamId: existingTeam.id,
      teamName: existingTeam.name,
    };
  }

  // Fetch org details from VCS provider
  const session = await auth();
  if (!session?.user?.id) {
    return {
      teamExists: false,
      error: "not_authenticated",
      message: "You must be signed in",
    };
  }

  const scopedVcs = vcs.getScoped(session.user.id, providerId);

  try {
    // Check if user is a member
    const membership = await scopedVcs.organizations.getMyMembership(ownerLogin);

    if (!membership.isMember) {
      return {
        teamExists: false,
        error: "not_member",
        message: `You are not a member of the ${ownerLogin} organization`,
      };
    }

    // Get org details
    const orgData = await scopedVcs.organizations.get(ownerLogin);

    return {
      teamExists: false,
      requiresCreation: true,
      providerId,
      orgLogin: ownerLogin,
      orgId: orgData.id,
      orgAvatarUrl: orgData.avatarUrl,
      orgName: orgData.name || orgData.login,
    };
  } catch (error) {
    console.error("Error checking org team status:", error);
    return {
      teamExists: false,
      error: "api_error",
      message: "Failed to check organization status",
    };
  }
}
```

## UI Components

**File:** `web/src/components/repos/org-team-prompt.tsx`

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar } from "@/components/ui/avatar";

interface OrgTeamPromptProps {
  providerId: string;
  orgLogin: string;
  orgName: string;
  orgAvatarUrl: string;
  onAccept: (accepted: boolean) => void;
}

export function OrgTeamPrompt({
  providerId,
  orgLogin,
  orgName,
  orgAvatarUrl,
  onAccept,
}: OrgTeamPromptProps) {
  const providerDisplayName =
    {
      github: "GitHub Organization",
      gitlab: "GitLab Group",
      gitea: "Gitea Organization",
      forgejo: "Forgejo Organization",
      bitbucket: "Bitbucket Workspace",
    }[providerId] || "Organization";

  return (
    <Alert variant="info" className="mb-4">
      <AlertTitle className="flex items-center gap-2">
        <Avatar src={orgAvatarUrl} alt={orgName} size="sm" />
        {providerDisplayName} Detected
      </AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          This repository belongs to the <strong>{orgName}</strong>{" "}
          {providerDisplayName.toLowerCase()}.
        </p>

        <p className="mb-2">A team will be created for this organization:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Create "{orgLogin}" team in Catalyst</li>
          <li>Add this repository to that team</li>
          <li>Allow team members to access this repository</li>
        </ul>

        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            onCheckedChange={(checked) => onAccept(!!checked)}
            required
          />
          <span>I understand and want to create this team</span>
        </label>
      </AlertDescription>
    </Alert>
  );
}
```

## Testing Strategy

### Unit Tests

**File:** `web/packages/@catalyst/vcs-provider/src/__tests__/organizations.test.ts`

Test VCS provider organization methods:

- `getOrganization()` returns correct data
- `listOrganizationMembers()` maps roles correctly
- `getMyOrganizationMembership()` handles member/non-member cases
- Role mapping functions work across providers

### Integration Tests

**File:** `web/__tests__/integration/webhooks/organization.test.ts`

Test webhook handling:

- `member_added` creates team membership
- `member_removed` deletes team membership
- `organization.deleted` soft-deletes team
- User matching via accounts table works

### E2E Tests

**File:** `web/__tests__/e2e/org-team-integration.spec.ts`

Test user flows:

- User connects org repo → sees confirmation → team created
- User connects org repo → team exists → no prompt
- User not in org → error shown

## Security Considerations

1. **Webhook Signature Verification**: Already implemented (HMAC-SHA256)
2. **Role Mapping**: Conservative - never promote to "owner" via webhooks
3. **Provider Validation**: Validate `vcs_provider_id` is in allowed list
4. **Access Control**: Check team membership before granting repo access
5. **User Matching**: Use provider account ID (not spoofable username)

## Rollback Plan

- Database migration includes DOWN migration
- VCS provider changes are additive (backward compatible)
- Feature flag: `ENABLE_VCS_ORG_TEAMS=true` (optional)
