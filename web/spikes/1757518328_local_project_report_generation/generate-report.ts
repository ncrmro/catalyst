#!/usr/bin/env tsx

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parse } from 'yaml';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { PullRequest, Issue } from '../../src/actions/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CommitInfo {
  sha: string;
  message: string;
  fullMessage: string;
  author: string;
  date: string;
}

interface ReleaseInfo {
  name: string;
  tag: string;
  published_at: string;
  body: string;
}

interface MilestoneInfo {
  id: number;
  number: number;
  title: string;
  description: string | null;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  due_on: string | null;
  open_issues: number;
  closed_issues: number;
}

interface RepositoryInfo {
  name: string;
  fullName: string;
  description: string | null;
  topics: string[];
  language: string | null;
  stars: number;
  forks: number;
  readme: string | null;
  recentCommits: CommitInfo[];
  latestRelease: ReleaseInfo | null;
  milestones: MilestoneInfo[];
}

interface Project {
  repos: string[];
  repositoryInfo: RepositoryInfo[];
  issues: Issue[];
  pullRequests: PullRequest[];
}

interface ProjectsConfig {
  projects: {
    [projectName: string]: Project;
  };
}

const shippedFeatureSchema = z.object({
  title: z.string().describe('Brief title of the shipped feature'),
  description: z.string().describe('Description of what was shipped'),
  commitSha: z.string().describe('Commit SHA (short form)'),
  commitUrl: z.string().describe('URL to the commit on GitHub'),
  prNumber: z.number().nullable().optional().describe('PR number if associated with a PR'),
  prUrl: z.string().nullable().optional().describe('URL to the PR if associated'),
  issueNumber: z.number().nullable().optional().describe('Issue number if associated with an issue'),
  issueUrl: z.string().nullable().optional().describe('URL to the issue if associated'),
  author: z.string().describe('Author of the commit'),
  date: z.string().describe('Date when the feature was shipped'),
});

const milestoneReportSchema = z.object({
  title: z.string().describe('Title of the milestone'),
  description: z.string().nullable().optional().describe('Description of the milestone'),
  state: z.enum(['open', 'closed']).describe('Current state of the milestone'),
  dueDate: z.string().nullable().optional().describe('Due date of the milestone if set'),
  progress: z.string().describe('Progress summary (e.g., "5 of 12 issues completed")'),
  openIssues: z.number().describe('Number of open issues in this milestone'),
  closedIssues: z.number().describe('Number of closed issues in this milestone'),
  repositoryName: z.string().describe('Name of the repository this milestone belongs to'),
  milestoneUrl: z.string().describe('URL to the milestone on GitHub'),
});

const projectReportSchema = z.object({
  projectName: z.string().describe('Name of the project'),
  title: z.string().describe('Title of the project report'),
  summary: z.string().describe('Executive summary of the project state'),
  description: z.string().describe('What the project does based on README and repository info'),
  technologyStack: z.array(z.string()).describe('Technologies and languages used'),
  repositoryCount: z.number().describe('Number of repositories'),
  totalStars: z.number().describe('Total stars across all repositories'),
  totalForks: z.number().describe('Total forks across all repositories'),
  milestones: z.array(milestoneReportSchema).describe('Active milestones with details, progress, and due dates'),
  recentlyShippedFeatures: z.array(shippedFeatureSchema).describe('Recently shipped features with links to commits, PRs, and issues'),
  recentActivity: z.string().describe('Summary of recent development activity'),
  issuesSummary: z.string().describe('Summary of issues and their status'),
  pullRequestsSummary: z.string().describe('Summary of pull requests and their status'),
  keyInsights: z.array(z.string()).describe('Key insights about project health and development'),
  recommendations: z.array(z.string()).describe('Actionable recommendations for improvement'),
  nextSteps: z.array(z.string()).describe('Suggested next steps for maintainers')
});

const SYSTEM_PROMPT = `You are a Project Report Generator that analyzes comprehensive GitHub repository data to provide insights about development activity, issues, and pull requests for a specific project.

Your responsibilities include:
1. Understanding what the project does based on repository descriptions and README content
2. Analyzing project activity across all repositories in the project
3. Identifying the technology stack and development patterns
4. Highlighting issues that need attention (old, high-priority, etc.)
5. Identifying pull requests that may be stale or need review
6. Providing actionable insights for project maintainers
7. Suggesting next steps to improve project health and development velocity

When generating reports:
- Use repository descriptions and README content to understand project purpose
- Analyze technology stack from repository languages and topics
- Consider repository popularity (stars/forks) in your analysis
- Focus on actionable insights rather than just data summaries
- Highlight potential bottlenecks or areas needing attention
- Consider the age of issues and PRs when making recommendations
- Look for patterns in labels, authors, and repository activity
- Keep recommendations specific and achievable for the project scope
- Consider the project as a cohesive unit across multiple repositories
- Reference recent commit activity to understand development velocity

The user will provide you with comprehensive data for a specific project including repository metadata, README content, recent commits, releases, issues, and pull requests.`;

async function loadProjectsConfig(): Promise<ProjectsConfig> {
  const configPath = path.join(__dirname, 'projects.yml');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Projects config file not found at ${configPath}`);
  }
  
  const yamlContent = fs.readFileSync(configPath, 'utf-8');
  return parse(yamlContent) as ProjectsConfig;
}

function calculateAge(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Extract PR and issue numbers from commit messages
 * Looks for patterns like (#123), #456, fixes #789, closes #321, etc.
 */
function extractReferences(commitMessage: string): { prNumbers: number[], issueNumbers: number[] } {
  const prPattern = /\(#(\d+)\)/g;
  const issuePattern = /(?:fix(?:es)?|close(?:s)?|resolve(?:s)?)\s*#(\d+)/gi;
  const generalPattern = /#(\d+)/g;
  
  const prNumbers: number[] = [];
  const issueNumbers: number[] = [];
  
  // Extract PR numbers from parentheses format like (#123)
  let match;
  while ((match = prPattern.exec(commitMessage)) !== null) {
    prNumbers.push(parseInt(match[1]));
  }
  
  // Extract issue numbers from fix/close/resolve patterns
  while ((match = issuePattern.exec(commitMessage)) !== null) {
    issueNumbers.push(parseInt(match[1]));
  }
  
  // If no specific patterns found, treat all #numbers as potential PR/issue refs
  if (prNumbers.length === 0 && issueNumbers.length === 0) {
    while ((match = generalPattern.exec(commitMessage)) !== null) {
      const num = parseInt(match[1]);
      // Could be either PR or issue - we'll need to check against actual data
      prNumbers.push(num);
    }
  }
  
  return { prNumbers, issueNumbers };
}

/**
 * Build URLs for commits, PRs, and issues
 */
function buildUrls(repoFullName: string, commitSha: string, prNumber?: number, issueNumber?: number) {
  const baseUrl = `https://github.com/${repoFullName}`;
  return {
    commitUrl: `${baseUrl}/commit/${commitSha}`,
    prUrl: prNumber ? `${baseUrl}/pull/${prNumber}` : null,
    issueUrl: issueNumber ? `${baseUrl}/issues/${issueNumber}` : null,
  };
}

/**
 * Extract version number from milestone title
 * Handles formats like: v1.0.0, 1.0.0, v1.0, 1.0, v1, Release 1.0.0, etc.
 */
function extractVersion(title: string): { major: number; minor: number; patch: number } | null {
  const versionPattern = /(?:v|version|release\s+)?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i;
  const match = title.match(versionPattern);
  
  if (match) {
    return {
      major: parseInt(match[1]) || 0,
      minor: parseInt(match[2]) || 0,
      patch: parseInt(match[3]) || 0,
    };
  }
  
  return null;
}

/**
 * Process milestone data for report generation
 */
function processMilestones(repositoryInfo: RepositoryInfo[]): any[] {
  const processedMilestones: any[] = [];
  
  for (const repo of repositoryInfo) {
    for (const milestone of repo.milestones) {
      const milestoneUrl = `https://github.com/${repo.fullName}/milestone/${milestone.number}`;
      const version = extractVersion(milestone.title);
      
      processedMilestones.push({
        title: milestone.title,
        description: milestone.description,
        state: milestone.state,
        dueDate: milestone.due_on,
        progress: `${milestone.closed_issues} of ${milestone.open_issues + milestone.closed_issues} issues completed`,
        openIssues: milestone.open_issues,
        closedIssues: milestone.closed_issues,
        repositoryName: repo.name,
        milestoneUrl,
        repositoryFullName: repo.fullName,
        createdAt: milestone.created_at,
        updatedAt: milestone.updated_at,
        version,
      });
    }
  }
  
  // Complex sort: 
  // 1. Open milestones first
  // 2. Within each state group, sort by:
  //    a. Milestones with due dates before those without
  //    b. By due date (earliest first for open, latest first for closed)
  //    c. By version number if detectable
  //    d. By title alphabetically
  return processedMilestones.sort((a, b) => {
    // First, separate open and closed
    if (a.state !== b.state) {
      return a.state === 'open' ? -1 : 1;
    }
    
    // For open milestones with due dates, prioritize by due date
    if (a.state === 'open') {
      if (a.dueDate && b.dueDate) {
        const dateCompare = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (dateCompare !== 0) return dateCompare;
      } else if (a.dueDate && !b.dueDate) {
        return -1; // Milestones with due dates come first
      } else if (!a.dueDate && b.dueDate) {
        return 1;
      }
    }
    
    // Try to sort by version number if both have versions
    if (a.version && b.version) {
      if (a.version.major !== b.version.major) {
        return a.version.major - b.version.major;
      }
      if (a.version.minor !== b.version.minor) {
        return a.version.minor - b.version.minor;
      }
      if (a.version.patch !== b.version.patch) {
        return a.version.patch - b.version.patch;
      }
    } else if (a.version && !b.version) {
      return -1; // Versioned milestones come first
    } else if (!a.version && b.version) {
      return 1;
    }
    
    // For closed milestones or when versions are equal, sort by due date if available
    if (a.state === 'closed' && a.dueDate && b.dueDate) {
      const dateCompare = new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(); // Most recent first for closed
      if (dateCompare !== 0) return dateCompare;
    }
    
    // Finally, sort alphabetically by title
    return a.title.localeCompare(b.title);
  });
}

/**
 * Analyze recent commits to identify shipped features
 */
function analyzeShippedFeatures(
  repositoryInfo: RepositoryInfo[], 
  pullRequests: PullRequest[], 
  issues: Issue[]
): any[] {
  const shippedFeatures: any[] = [];
  
  for (const repo of repositoryInfo) {
    // Get recent commits (last 2 weeks)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentCommits = repo.recentCommits.filter(commit => 
      new Date(commit.date) > twoWeeksAgo
    );
    
    for (const commit of recentCommits) {
      // Skip trivial commits
      if (isTrivialCommit(commit.message)) {
        continue;
      }
      
      const { prNumbers, issueNumbers } = extractReferences(commit.fullMessage);
      const urls = buildUrls(repo.fullName, commit.sha, prNumbers[0], issueNumbers[0]);
      
      // Find related PR and issue from the data
      const relatedPR = prNumbers.length > 0 ? 
        pullRequests.find(pr => pr.number === prNumbers[0] && pr.repository === repo.name) : null;
      const relatedIssue = issueNumbers.length > 0 ?
        issues.find(issue => issue.number === issueNumbers[0] && issue.repository === repo.name) : null;
      
      shippedFeatures.push({
        repository: repo.fullName,
        title: commit.message,
        description: commit.fullMessage.split('\n')[0], // First line as description
        commitSha: commit.sha,
        commitUrl: urls.commitUrl,
        prNumber: relatedPR?.number || prNumbers[0] || null,
        prUrl: relatedPR ? urls.prUrl : null,
        issueNumber: relatedIssue?.number || issueNumbers[0] || null,
        issueUrl: relatedIssue ? urls.issueUrl : null,
        author: commit.author,
        date: commit.date,
        fullCommitMessage: commit.fullMessage,
      });
    }
  }
  
  return shippedFeatures.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Check if a commit message represents trivial changes
 */
function isTrivialCommit(message: string): boolean {
  const trivialPatterns = [
    /^chore:/,
    /^docs?:/,
    /^style:/,
    /^refactor:/,
    /typo/i,
    /formatting/i,
    /whitespace/i,
    /^update/i,
    /^bump/i,
  ];
  
  return trivialPatterns.some(pattern => pattern.test(message.toLowerCase()));
}

async function generateProjectReport(projectName: string, project: Project) {
  const model = openai('gpt-4o-mini');

  // Calculate statistics using reducers for efficiency
  const prStats = project.pullRequests.reduce((acc, pr) => {
    switch (pr.status) {
      case 'draft':
        acc.draft.push(pr);
        break;
      case 'ready':
        acc.ready.push(pr);
        break;
      case 'changes_requested':
        acc.changesRequested.push(pr);
        break;
    }
    return acc;
  }, {
    draft: [] as PullRequest[],
    ready: [] as PullRequest[],
    changesRequested: [] as PullRequest[]
  });

  const issueStats = project.issues.reduce((acc, issue) => {
    switch (issue.state) {
      case 'open':
        acc.open.push(issue);
        break;
      case 'closed':
        acc.closed.push(issue);
        break;
    }
    return acc;
  }, {
    open: [] as Issue[],
    closed: [] as Issue[]
  });

  // Calculate repository statistics
  const totalStars = project.repositoryInfo.reduce((sum, repo) => sum + repo.stars, 0);
  const totalForks = project.repositoryInfo.reduce((sum, repo) => sum + repo.forks, 0);
  const technologies = [...new Set(project.repositoryInfo.map(repo => repo.language).filter(Boolean))];
  const topics = [...new Set(project.repositoryInfo.flatMap(repo => repo.topics))];
  const totalMilestones = project.repositoryInfo.reduce((sum, repo) => sum + repo.milestones.length, 0);
  const openMilestones = project.repositoryInfo.reduce((sum, repo) => 
    sum + repo.milestones.filter(m => m.state === 'open').length, 0);
  
  // Calculate milestone statistics for issues and PRs
  const issuesWithMilestones = project.issues.filter(issue => issue.milestone).length;
  const prsWithMilestones = project.pullRequests.filter(pr => pr.milestone).length;
  
  // Analyze shipped features from recent commits
  const shippedFeatures = analyzeShippedFeatures(project.repositoryInfo, project.pullRequests, project.issues);
  
  // Process milestone data
  const processedMilestones = processMilestones(project.repositoryInfo);

  const prompt = `You must generate a comprehensive project report as a JSON object that matches the provided schema exactly. Generate a report for the "${projectName}" project based on the following data:

PROJECT OVERVIEW:
- Project Name: ${projectName}
- Repositories: ${project.repos.join(', ')}
- Total Stars: ${totalStars}
- Total Forks: ${totalForks}
- Technologies: ${technologies.join(', ')}
- Topics: ${topics.join(', ')}
- Total Issues: ${project.issues.length} (${issueStats.open.length} open, ${issueStats.closed.length} closed)
- Total Pull Requests: ${project.pullRequests.length} (${prStats.draft.length} drafts, ${prStats.ready.length} ready, ${prStats.changesRequested.length} changes requested)
- Milestones: ${totalMilestones} total (${openMilestones} open)
- Issues with Milestones: ${issuesWithMilestones}/${project.issues.length}
- PRs with Milestones: ${prsWithMilestones}/${project.pullRequests.length}

REPOSITORY INFORMATION:
${JSON.stringify(project.repositoryInfo, null, 2)}

MILESTONES DATA:
${JSON.stringify(processedMilestones, null, 2)}

RECENTLY SHIPPED FEATURES (Last 2 weeks, non-trivial commits):
${JSON.stringify(shippedFeatures, null, 2)}

ISSUES DATA:
${JSON.stringify(project.issues, null, 2)}

PULL REQUESTS DATA:
${JSON.stringify(project.pullRequests, null, 2)}

Please analyze this project data and provide:
1. Project overview with description derived from repository README content
2. Technology stack analysis from repository languages and topics
3. Detailed milestone analysis with titles, descriptions, progress, and due dates
4. Recently shipped features analysis with proper linking to commits, PRs, and issues
5. Repository activity analysis across all repos in the project
6. Issues analysis with focus on aging issues, patterns, and priority
7. Pull request analysis with attention to stale PRs and development velocity
8. Actionable recommendations for project improvement
9. Specific next steps for maintainers

IMPORTANT: For the recentlyShippedFeatures array, analyze the RECENTLY SHIPPED FEATURES data and extract meaningful shipped features. Each feature should include:
- title: Brief descriptive title of what was shipped
- description: More detailed description of the feature/change
- commitSha: The commit SHA (short form)
- commitUrl: Full GitHub URL to the commit
- prNumber: PR number if linked (can be null)
- prUrl: Full GitHub URL to the PR if linked (can be null)
- issueNumber: Issue number if linked (can be null) 
- issueUrl: Full GitHub URL to the issue if linked (can be null)
- author: Commit author name
- date: ISO date string of when it was committed

Prioritize meaningful features over trivial changes. Focus on commits that represent actual shipped functionality, bug fixes, or significant improvements.

IMPORTANT: For the milestones array, analyze the MILESTONES DATA and create detailed milestone reports. Each milestone should include:
- title: Milestone title
- description: Milestone description (can be null)
- state: 'open' or 'closed'
- dueDate: Due date in ISO format (can be null)
- progress: Human-readable progress summary
- openIssues: Number of open issues
- closedIssues: Number of closed issues
- repositoryName: Repository name
- milestoneUrl: Full GitHub URL to the milestone

Focus on providing insights about:
- Which milestones are approaching their due dates
- Progress towards milestone completion
- Whether milestones have clear descriptions and due dates
- How well the project uses milestones for planning

Focus on insights that help improve:
- Understanding what the project does and its purpose
- Development velocity and efficiency based on recent commit activity
- Issue resolution and prioritization
- Code review processes and PR management
- Project planning and milestone-based organization
- Overall project health and maintainability
- Technology stack coherence and modernization

Use the repository descriptions, README content, and recent commits to provide context-aware recommendations that align with the project's actual goals and purpose.`;

  const result = await generateObject({
    model,
    system: SYSTEM_PROMPT,
    prompt,
    schema: projectReportSchema,
    schemaName: 'ProjectReport',
  });

  return result.object;
}

function formatProjectReport(report: any): string {
  const formatList = (items: string[]) => items.map(item => `  - ${item}`).join('\n');
  
  const formatMilestones = (milestones: any[]) => {
    if (!milestones || milestones.length === 0) {
      return '  No milestones found in the repositories.';
    }
    
    return milestones.map(milestone => {
      let result = `  - **[${milestone.title}](${milestone.milestoneUrl})** (${milestone.repositoryName}) - ${milestone.state.toUpperCase()}\n`;
      
      if (milestone.description) {
        result += `    - ${milestone.description}\n`;
      }
      
      result += `    - Progress: ${milestone.progress}\n`;
      
      if (milestone.dueDate) {
        const dueDate = new Date(milestone.dueDate);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        result += `    - Due: ${dueDate.toLocaleDateString()}`;
        if (milestone.state === 'open') {
          if (daysUntilDue < 0) {
            result += ` ⚠️ **${Math.abs(daysUntilDue)} days overdue**`;
          } else if (daysUntilDue <= 7) {
            result += ` ⚠️ **Due in ${daysUntilDue} days**`;
          } else {
            result += ` (${daysUntilDue} days remaining)`;
          }
        }
        result += `\n`;
      } else if (milestone.state === 'open') {
        result += `    - Due: No due date set ⚠️\n`;
      }
      
      return result;
    }).join('\n');
  };

  const formatShippedFeatures = (features: any[]) => {
    if (!features || features.length === 0) {
      return '  No recently shipped features found in the last 2 weeks.';
    }
    
    return features.map(feature => {
      let result = `  - **${feature.title}** by ${feature.author}\n`;
      result += `    - ${feature.description}\n`;
      result += `    - Commit: [\`${feature.commitSha}\`](${feature.commitUrl})\n`;
      
      if (feature.prNumber && feature.prUrl) {
        result += `    - Pull Request: [#${feature.prNumber}](${feature.prUrl})\n`;
      }
      
      if (feature.issueNumber && feature.issueUrl) {
        result += `    - Issue: [#${feature.issueNumber}](${feature.issueUrl})\n`;
      }
      
      result += `    - Date: ${new Date(feature.date).toLocaleDateString()}\n`;
      
      return result;
    }).join('\n');
  };

  return `
# ${report.title}

**Project:** ${report.projectName}

## Executive Summary
${report.summary}

## Project Description
${report.description}

## Technology Stack
${formatList(report.technologyStack)}

## Project Metrics
- **Repositories:** ${report.repositoryCount}
- **Total Stars:** ${report.totalStars}
- **Total Forks:** ${report.totalForks}

## Milestones
${formatMilestones(report.milestones)}

## Recently Shipped Features
${formatShippedFeatures(report.recentlyShippedFeatures)}

## Recent Activity
${report.recentActivity}

## Issues Summary
${report.issuesSummary}

## Pull Requests Summary
${report.pullRequestsSummary}

## Key Insights
${formatList(report.keyInsights)}

## Recommendations
${formatList(report.recommendations)}

## Next Steps
${formatList(report.nextSteps)}

---
*Report generated on ${new Date().toISOString()}*
`;
}

async function main() {
  try {
    console.log('Loading projects configuration...');
    const config = await loadProjectsConfig();
    
    console.log('Generating project reports...\n');
    
    for (const [projectName, project] of Object.entries(config.projects)) {
      console.log(`Generating report for project: ${projectName}`);
      
      if (project.issues.length === 0 && project.pullRequests.length === 0) {
        console.log(`  Skipping ${projectName} - no data available. Run fetch script first.`);
        continue;
      }
      
      const report = await generateProjectReport(projectName, project);
      const formattedReport = formatProjectReport(report);
      
      const outputPath = path.join(__dirname, `${projectName}-report.md`);
      fs.writeFileSync(outputPath, formattedReport, 'utf-8');
      
      console.log(`  Report saved to: ${outputPath}`);
      console.log(`  Summary: ${project.issues.length} issues, ${project.pullRequests.length} PRs analyzed\n`);
    }
    
    console.log('All project reports generated successfully!');
    
  } catch (error) {
    console.error('Failed to generate project reports:', error);
    process.exit(1);
  }
}

main();