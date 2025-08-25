import { db } from '@/db';
import { users, userGithubInstallations } from '@/db/schema';
import { PeriodicReportAgent } from '@/agents/periodic-report';
import { createGitHubAppService } from '@/lib/github-app';
import { eq, inArray } from 'drizzle-orm';

export interface PeriodicReportJobConfig {
  userIds?: string[];
  sendEmail?: boolean;
  storeInDatabase?: boolean;
}

export class PeriodicReportJob {
  private githubAppService = createGitHubAppService();
  
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
  ): Promise<{
    title?: string;
    summary?: string;
    projectsAnalysis?: {
      totalProjects?: number;
      activeEnvironments?: number;
      inactiveEnvironments?: number;
      insights?: string[];
    };
    clustersAnalysis?: {
      totalClusters?: number;
      insights?: string[];
    };
    recommendations?: string[];
    nextSteps?: string[];
  } | null> {
    const { sendEmail = false, storeInDatabase = true } = options;

    try {
      console.log(`Generating periodic report for user ${userId}`);

      // Get installation token for this user
      const installationToken = await this.githubAppService.getUserInstallationToken(userId);
      
      if (!installationToken) {
        console.warn(`No GitHub installation found for user ${userId}, skipping report generation`);
        return null;
      }

      // Create agent with installation token
      const agent = new PeriodicReportAgent({
        provider: 'anthropic',
        enableGitHubMCP: true,
        accessToken: installationToken, // Use installation token instead of session token
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
      return report;
    } catch (error) {
      console.error(`Failed to generate report for user ${userId}:`, error);
      throw error;
    }
  }

  private async storeReport(userId: string, report: { title?: string; summary?: string }): Promise<void> {
    // TODO: Implement database storage for reports
    // You might want to create a reports table in your schema
    console.log(`Report storage not implemented yet for user ${userId}`);
    console.log('Report summary:', report.summary);
  }

  private async sendReportEmail(userId: string, report: { title?: string; summary?: string }): Promise<void> {
    // TODO: Implement email sending logic
    // You could use services like SendGrid, AWS SES, etc.
    console.log(`Email sending not implemented yet for user ${userId}`);
    console.log('Report title:', report.title);
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