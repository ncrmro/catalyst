# GitHub App-Based Periodic Reports

This document explains how to enable periodic report generation using GitHub App installation tokens, allowing Catalyst to generate reports for users even when they are not actively signed in.

## Overview

By default, the Catalyst periodic report agent uses user session access tokens from GitHub OAuth. However, this approach has limitations:

- **Session Dependency**: Reports can only be generated when users are actively signed in
- **Token Expiration**: User session tokens may expire, interrupting automated report generation
- **Manual Triggers**: Reports require user interaction to initiate

Using GitHub App installation tokens solves these problems by providing persistent access to repositories without requiring active user sessions.

## Architecture

### Current Session-Based Approach

```mermaid
graph TD
    A[User Signs In] --> B[GitHub OAuth Token]
    B --> C[Session Storage]
    C --> D[Periodic Report Agent]
    D --> E[GitHub MCP Server]
    E --> F[Repository Data]
```

**Limitations:**
- Requires active user session
- Token expires with session
- No background report generation

### Proposed GitHub App Approach

```mermaid
graph TD
    A[User Installs GitHub App] --> B[Installation ID Stored]
    B --> C[Background Job/Cron]
    C --> D[Get Installation Token]
    D --> E[Periodic Report Agent]
    E --> F[GitHub MCP Server]
    F --> G[Repository Data]
    G --> H[Generated Report]
    H --> I[Store/Email/Notify User]
```

**Benefits:**
- No active session required
- Persistent access via installation tokens
- Enables automated/scheduled report generation
- Better reliability for production use

## Implementation Guide

### Step 1: Database Schema for GitHub App Installations

First, add tables to store GitHub App installation data:

```sql
-- GitHub App installations table
CREATE TABLE github_installations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id BIGINT NOT NULL UNIQUE,
    account_id BIGINT NOT NULL,
    account_login TEXT NOT NULL,
    account_type TEXT NOT NULL, -- 'User' or 'Organization'
    target_type TEXT NOT NULL, -- 'User' or 'Organization'
    permissions JSONB,
    events TEXT[],
    single_file_name TEXT,
    has_multiple_single_files BOOLEAN DEFAULT FALSE,
    suspended_by TEXT,
    suspended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Link installations to users
CREATE TABLE user_github_installations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    installation_id TEXT NOT NULL REFERENCES github_installations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, installation_id)
);

-- Repository access through installations
CREATE TABLE installation_repositories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id TEXT NOT NULL REFERENCES github_installations(id) ON DELETE CASCADE,
    repository_id BIGINT NOT NULL,
    repository_name TEXT NOT NULL,
    repository_full_name TEXT NOT NULL,
    private BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(installation_id, repository_id)
);
```

### Step 2: Drizzle Schema Implementation

Add to `src/db/schema.ts`:

```typescript
export const githubInstallations = pgTable("github_installations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  installationId: integer("installation_id").notNull().unique(),
  accountId: integer("account_id").notNull(),
  accountLogin: text("account_login").notNull(),
  accountType: text("account_type").notNull(), // 'User' | 'Organization'
  targetType: text("target_type").notNull(), // 'User' | 'Organization'
  permissions: text("permissions"), // JSON string
  events: text("events"), // JSON array as string
  singleFileName: text("single_file_name"),
  hasMultipleSingleFiles: boolean("has_multiple_single_files").default(false),
  suspendedBy: text("suspended_by"),
  suspendedAt: timestamp("suspended_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const userGithubInstallations = pgTable(
  "user_github_installations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    installationId: text("installation_id")
      .notNull()
      .references(() => githubInstallations.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // 'owner', 'admin', 'member'
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    {
      uniqueUserInstallation: primaryKey({
        columns: [table.userId, table.installationId],
      }),
    },
  ]
);

export const installationRepositories = pgTable(
  "installation_repositories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    installationId: text("installation_id")
      .notNull()
      .references(() => githubInstallations.id, { onDelete: "cascade" }),
    repositoryId: integer("repository_id").notNull(),
    repositoryName: text("repository_name").notNull(),
    repositoryFullName: text("repository_full_name").notNull(),
    private: boolean("private").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    {
      uniqueInstallationRepo: primaryKey({
        columns: [table.installationId, table.repositoryId],
      }),
    },
  ]
);
```

### Step 3: GitHub App Installation Token Service

Create `src/lib/github-app.ts`:

```typescript
import { App } from '@octokit/app';
import { db } from '@/db';
import { githubInstallations, userGithubInstallations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  clientId: string;
  clientSecret: string;
}

export class GitHubAppService {
  private app: App;

  constructor(config: GitHubAppConfig) {
    this.app = new App({
      appId: config.appId,
      privateKey: config.privateKey,
      oauth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      },
    });
  }

  /**
   * Get an installation access token for a specific installation
   */
  async getInstallationToken(installationId: number): Promise<string> {
    try {
      const octokit = await this.app.getInstallationOctokit(installationId);
      const { data } = await octokit.rest.apps.createInstallationAccessToken({
        installation_id: installationId,
      });
      return data.token;
    } catch (error) {
      throw new Error(`Failed to get installation token: ${error}`);
    }
  }

  /**
   * Store GitHub app installation in database
   */
  async storeInstallation(payload: any, userId?: string): Promise<void> {
    const { installation, sender } = payload;
    
    try {
      // Store installation
      const [storedInstallation] = await db
        .insert(githubInstallations)
        .values({
          installationId: installation.id,
          accountId: installation.account.id,
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          targetType: installation.target_type,
          permissions: JSON.stringify(installation.permissions),
          events: JSON.stringify(installation.events),
          singleFileName: installation.single_file_name,
          hasMultipleSingleFiles: installation.has_multiple_single_files || false,
        })
        .onConflictDoUpdate({
          target: githubInstallations.installationId,
          set: {
            permissions: JSON.stringify(installation.permissions),
            events: JSON.stringify(installation.events),
            updatedAt: new Date(),
          },
        })
        .returning();

      // Link to user if provided
      if (userId && storedInstallation) {
        await db
          .insert(userGithubInstallations)
          .values({
            userId,
            installationId: storedInstallation.id,
            role: installation.account.login === sender?.login ? 'owner' : 'member',
          })
          .onConflictDoNothing();
      }
    } catch (error) {
      console.error('Failed to store GitHub installation:', error);
      throw error;
    }
  }

  /**
   * Get user's GitHub installations
   */
  async getUserInstallations(userId: string) {
    return await db
      .select({
        installation: githubInstallations,
        userRole: userGithubInstallations.role,
      })
      .from(userGithubInstallations)
      .innerJoin(
        githubInstallations,
        eq(userGithubInstallations.installationId, githubInstallations.id)
      )
      .where(eq(userGithubInstallations.userId, userId));
  }

  /**
   * Get installation token for user's first available installation
   */
  async getUserInstallationToken(userId: string): Promise<string | null> {
    const installations = await this.getUserInstallations(userId);
    
    if (installations.length === 0) {
      return null;
    }

    // Use the first installation (you might want to add logic to select the best one)
    const installation = installations[0];
    return await this.getInstallationToken(installation.installation.installationId);
  }
}

// Singleton instance
export function createGitHubAppService(): GitHubAppService {
  return new GitHubAppService({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_PRIVATE_KEY!,
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  });
}
```

### Step 4: Enhanced Periodic Report Agent

Modify `src/agents/periodic-report.ts` to support installation tokens:

```typescript
export interface PeriodicReportOptions {
  provider?: 'anthropic' | 'openai';
  model?: string;
  enableGitHubMCP?: boolean;
  gitHubMCPApiKey?: string;
  accessToken?: string;
  // New option for installation-based reports
  userId?: string;
  useInstallationToken?: boolean;
}

export class PeriodicReportAgent {
  private gitHubAppService?: GitHubAppService;
  
  constructor(options: PeriodicReportOptions = {}) {
    this.provider = options.provider || 'anthropic';
    this.model = options.model || (this.provider === 'anthropic' ? 'claude-3-sonnet-20240229' : 'gpt-4');
    this.enableGitHubMCP = options.enableGitHubMCP ?? true;
    this.userId = options.userId;
    this.useInstallationToken = options.useInstallationToken ?? false;
    
    if (this.enableGitHubMCP) {
      this.gitHubAppService = createGitHubAppService();
      
      if (this.useInstallationToken && this.userId) {
        // Initialize with installation token (async)
        this.initializeWithInstallationToken();
      } else if (options.accessToken) {
        // Use provided session access token
        this.gitHubMCPClient = createGitHubMCPClient({
          accessToken: options.accessToken,
        });
      } else if (options.gitHubMCPApiKey) {
        // Use provided API key
        this.gitHubMCPClient = getGitHubMCPClient({
          apiKey: options.gitHubMCPApiKey,
        });
      } else {
        // Fallback to default client (uses environment variable)
        this.gitHubMCPClient = getGitHubMCPClient();
      }
    }
  }

  private async initializeWithInstallationToken(): Promise<void> {
    if (!this.gitHubAppService || !this.userId) {
      return;
    }

    try {
      const installationToken = await this.gitHubAppService.getUserInstallationToken(this.userId);
      
      if (installationToken) {
        this.gitHubMCPClient = createGitHubMCPClient({
          accessToken: installationToken,
        });
        console.log('GitHub MCP client initialized with installation token');
      } else {
        console.warn('No GitHub installation found for user, falling back to default client');
        this.gitHubMCPClient = getGitHubMCPClient();
      }
    } catch (error) {
      console.error('Failed to initialize with installation token:', error);
      this.gitHubMCPClient = getGitHubMCPClient();
    }
  }

  async generateReport(): Promise<z.infer<typeof reportSchema>> {
    // Ensure installation token is ready if using it
    if (this.useInstallationToken && this.userId && !this.gitHubMCPClient) {
      await this.initializeWithInstallationToken();
    }

    // Rest of the existing generateReport logic...
    return super.generateReport();
  }
}
```

### Step 5: Background Job for Periodic Reports

Create `src/jobs/periodic-reports.ts`:

```typescript
import { db } from '@/db';
import { users, userGithubInstallations } from '@/db/schema';
import { PeriodicReportAgent } from '@/agents/periodic-report';
import { eq } from 'drizzle-orm';

export interface PeriodicReportJobConfig {
  userIds?: string[];
  sendEmail?: boolean;
  storeInDatabase?: boolean;
}

export class PeriodicReportJob {
  
  /**
   * Generate periodic reports for all users with GitHub installations
   */
  async generateReportsForAllUsers(config: PeriodicReportJobConfig = {}): Promise<void> {
    const { userIds, sendEmail = false, storeInDatabase = true } = config;
    
    try {
      // Get users with GitHub installations
      let usersWithInstallations;
      
      if (userIds && userIds.length > 0) {
        // Generate reports for specific users
        usersWithInstallations = await db
          .select({ user: users })
          .from(users)
          .innerJoin(userGithubInstallations, eq(users.id, userGithubInstallations.userId))
          .where(inArray(users.id, userIds));
      } else {
        // Generate reports for all users with installations
        usersWithInstallations = await db
          .select({ user: users })
          .from(users)
          .innerJoin(userGithubInstallations, eq(users.id, userGithubInstallations.userId));
      }

      console.log(`Generating periodic reports for ${usersWithInstallations.length} users`);

      // Process each user
      for (const { user } of usersWithInstallations) {
        try {
          await this.generateReportForUser(user.id, {
            sendEmail,
            storeInDatabase,
          });
        } catch (error) {
          console.error(`Failed to generate report for user ${user.id}:`, error);
          // Continue with other users
        }
      }

      console.log('Periodic report generation completed');
    } catch (error) {
      console.error('Failed to generate periodic reports:', error);
      throw error;
    }
  }

  /**
   * Generate a periodic report for a specific user
   */
  async generateReportForUser(
    userId: string, 
    options: { sendEmail?: boolean; storeInDatabase?: boolean } = {}
  ): Promise<void> {
    const { sendEmail = false, storeInDatabase = true } = options;

    try {
      console.log(`Generating periodic report for user ${userId}`);

      // Create agent with installation token
      const agent = new PeriodicReportAgent({
        provider: 'anthropic',
        enableGitHubMCP: true,
        userId,
        useInstallationToken: true,
      });

      // Generate the report
      const report = await agent.generateReport();

      if (storeInDatabase) {
        // Store report in database (you'll need to implement this)
        await this.storeReport(userId, report);
      }

      if (sendEmail) {
        // Send email notification (you'll need to implement this)
        await this.sendReportEmail(userId, report);
      }

      console.log(`Successfully generated report for user ${userId}`);
    } catch (error) {
      console.error(`Failed to generate report for user ${userId}:`, error);
      throw error;
    }
  }

  private async storeReport(userId: string, report: any): Promise<void> {
    // Implement database storage for reports
    // You might want to create a reports table in your schema
    console.log('Report storage not implemented yet');
  }

  private async sendReportEmail(userId: string, report: any): Promise<void> {
    // Implement email sending logic
    // You could use services like SendGrid, AWS SES, etc.
    console.log('Email sending not implemented yet');
  }
}

/**
 * CLI script for running periodic reports
 * Usage: npx tsx src/jobs/periodic-reports.ts
 */
if (require.main === module) {
  const job = new PeriodicReportJob();
  
  job.generateReportsForAllUsers({
    sendEmail: false,
    storeInDatabase: true,
  }).then(() => {
    console.log('Job completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('Job failed:', error);
    process.exit(1);
  });
}
```

### Step 6: Updated Webhook Handler

Modify `src/app/api/github/webhook/route.ts` to store installations:

```typescript
import { GitHubAppService } from '@/lib/github-app';

const githubApp = createGitHubAppService();

export async function POST(request: NextRequest) {
  // ... existing webhook validation logic ...

  try {
    const payload = await request.json();
    const eventType = request.headers.get('x-github-event');

    switch (eventType) {
      case 'installation':
        await handleInstallationEvent(payload);
        break;
      case 'installation_repositories':
        await handleInstallationRepositoriesEvent(payload);
        break;
      // ... other events ...
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleInstallationEvent(payload: any) {
  const { action, installation, sender } = payload;

  switch (action) {
    case 'created':
      console.log('GitHub App installed:', installation.id);
      // Store installation in database
      await githubApp.storeInstallation(payload);
      break;
    case 'deleted':
      console.log('GitHub App uninstalled:', installation.id);
      // Remove installation from database
      // TODO: Implement removal logic
      break;
    case 'suspend':
    case 'unsuspend':
      console.log(`GitHub App ${action}:`, installation.id);
      // Update installation status
      // TODO: Implement status update logic
      break;
  }
}
```

## Usage Examples

### 1. Generate Report with Installation Token (Background Job)

```typescript
import { PeriodicReportJob } from '@/jobs/periodic-reports';

// Generate reports for all users
const job = new PeriodicReportJob();
await job.generateReportsForAllUsers({
  sendEmail: true,
  storeInDatabase: true,
});

// Generate report for specific user
await job.generateReportForUser('user-123', {
  sendEmail: false,
  storeInDatabase: true,
});
```

### 2. Cron Job Setup

```typescript
// Using node-cron for scheduled reports
import cron from 'node-cron';
import { PeriodicReportJob } from '@/jobs/periodic-reports';

const job = new PeriodicReportJob();

// Run weekly reports every Monday at 9 AM
cron.schedule('0 9 * * 1', async () => {
  console.log('Starting weekly periodic reports...');
  await job.generateReportsForAllUsers({
    sendEmail: true,
    storeInDatabase: true,
  });
});
```

### 3. API Endpoint for Manual Report Generation

```typescript
// src/app/api/reports/generate/route.ts
import { PeriodicReportJob } from '@/jobs/periodic-reports';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const job = new PeriodicReportJob();
    await job.generateReportForUser(session.user.id, {
      sendEmail: false,
      storeInDatabase: true,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Report generated successfully' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
```

## Environment Variables

Add these to your `.env.local`:

```env
# GitHub App Configuration (required for installation tokens)
GITHUB_APP_ID=your_github_app_id
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
your_private_key_here
-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# GitHub MCP API Key (fallback when installation tokens aren't available)
GITHUB_MCP_API_KEY=your_github_mcp_api_key

# AI Provider Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Production Deployment

### 1. Database Migration

Run the database migration to add the new tables:

```bash
npm run db:generate
npm run db:migrate
```

### 2. Scheduled Jobs

Set up scheduled jobs using your preferred method:

**Option A: Using cron in Docker/server**
```bash
# Add to crontab
0 9 * * 1 cd /app && npx tsx src/jobs/periodic-reports.ts
```

**Option B: Using GitHub Actions**
```yaml
name: Generate Periodic Reports
on:
  schedule:
    - cron: '0 9 * * 1' # Every Monday at 9 AM
jobs:
  generate-reports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate Reports
        run: |
          cd web
          npm install
          npx tsx src/jobs/periodic-reports.ts
```

**Option C: Using cloud services (AWS Lambda, Vercel Functions, etc.)**

### 3. Monitoring and Alerts

Set up monitoring for:
- Failed report generations
- GitHub API rate limits
- Installation token refresh failures
- Database storage issues

## Benefits of This Approach

1. **Background Processing**: Reports can be generated without user interaction
2. **Reliable Access**: Installation tokens provide persistent repository access
3. **Scalable**: Can generate reports for multiple users simultaneously
4. **Automated**: Can be scheduled to run periodically
5. **Flexible**: Supports both session-based and installation-based authentication

## Migration from Session-Based to Installation-Based

### Phase 1: Add Installation Support
1. Add database schema for installations
2. Update webhook handlers to store installations
3. Create GitHub App service for token management

### Phase 2: Update Report Agent
1. Add installation token support to PeriodicReportAgent
2. Create background job system
3. Add API endpoints for manual report generation

### Phase 3: Enable Background Jobs
1. Set up scheduled job system
2. Configure monitoring and alerts
3. Migrate users to installation-based reports

### Backward Compatibility

The enhanced system maintains backward compatibility:
- Session-based reports continue to work for active users
- Installation-based reports work for background generation
- Falls back gracefully when installations aren't available

## Security Considerations

1. **Token Storage**: Installation access tokens are generated on-demand and not stored
2. **Permissions**: GitHub App permissions should be minimal (read-only for repositories)
3. **Rate Limiting**: Implement proper rate limiting for GitHub API calls
4. **Access Control**: Ensure only authorized users can trigger report generation
5. **Audit Logging**: Log all report generation activities for security auditing

This implementation provides a robust foundation for generating periodic reports without requiring active user sessions, while maintaining security and scalability.