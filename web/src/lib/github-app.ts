import { App } from '@octokit/app';
import { db } from '@/db';
import { githubInstallations, userGithubInstallations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface GitHubInstallationPayload {
  installation: {
    id: number;
    account: {
      id: number;
      login: string;
      type: string;
    };
    target_type: string;
    permissions: Record<string, string>;
    events: string[];
    single_file_name?: string;
    has_multiple_single_files?: boolean;
  };
  sender?: {
    login: string;
  };
}

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
      const installationOctokit = await this.app.getInstallationOctokit(installationId);
      // Access token is available through the auth object
      const auth = await installationOctokit.auth() as { token: string };
      return auth.token;
    } catch (error) {
      throw new Error(`Failed to get installation token: ${error}`);
    }
  }

  /**
   * Store GitHub app installation in database
   */
  async storeInstallation(payload: GitHubInstallationPayload, userId?: string): Promise<void> {
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
   * Remove GitHub app installation from database
   */
  async removeInstallation(installationId: number): Promise<void> {
    try {
      await db
        .delete(githubInstallations)
        .where(eq(githubInstallations.installationId, installationId));
    } catch (error) {
      console.error('Failed to remove GitHub installation:', error);
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

  /**
   * Get all users who have GitHub installations (for background job processing)
   */
  async getUsersWithInstallations(): Promise<string[]> {
    const result = await db
      .selectDistinct({ userId: userGithubInstallations.userId })
      .from(userGithubInstallations);
    
    return result.map(row => row.userId);
  }

  /**
   * Update installation permissions and events
   */
  async updateInstallation(payload: GitHubInstallationPayload): Promise<void> {
    const { installation } = payload;
    
    try {
      await db
        .update(githubInstallations)
        .set({
          permissions: JSON.stringify(installation.permissions),
          events: JSON.stringify(installation.events),
          updatedAt: new Date(),
        })
        .where(eq(githubInstallations.installationId, installation.id));
    } catch (error) {
      console.error('Failed to update GitHub installation:', error);
      throw error;
    }
  }

  /**
   * Suspend or unsuspend an installation
   */
  async updateInstallationStatus(installationId: number, suspended: boolean, suspendedBy?: string): Promise<void> {
    try {
      await db
        .update(githubInstallations)
        .set({
          suspendedBy: suspended ? suspendedBy || null : null,
          suspendedAt: suspended ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(githubInstallations.installationId, installationId));
    } catch (error) {
      console.error('Failed to update installation status:', error);
      throw error;
    }
  }
}

// Singleton instance
let githubAppService: GitHubAppService | null = null;

export function createGitHubAppService(): GitHubAppService {
  if (!githubAppService) {
    githubAppService = new GitHubAppService({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!,
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    });
  }
  return githubAppService;
}

export function resetGitHubAppService(): void {
  githubAppService = null;
}