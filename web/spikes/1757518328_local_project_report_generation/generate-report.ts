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

const projectReportSchema = z.object({
  projectName: z.string().describe('Name of the project'),
  title: z.string().describe('Title of the project report'),
  summary: z.string().describe('Executive summary of the project state'),
  description: z.string().describe('What the project does based on README and repository info'),
  technologyStack: z.array(z.string()).describe('Technologies and languages used'),
  repositoryCount: z.number().describe('Number of repositories'),
  totalStars: z.number().describe('Total stars across all repositories'),
  totalForks: z.number().describe('Total forks across all repositories'),
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

ISSUES DATA:
${JSON.stringify(project.issues, null, 2)}

PULL REQUESTS DATA:
${JSON.stringify(project.pullRequests, null, 2)}

Please analyze this project data and provide:
1. Project overview with description derived from repository README content
2. Technology stack analysis from repository languages and topics
3. Repository activity analysis across all repos in the project
4. Issues analysis with focus on aging issues, patterns, and priority
5. Pull request analysis with attention to stale PRs and development velocity
6. Milestone analysis for project planning and organization insights
7. Actionable recommendations for project improvement
8. Specific next steps for maintainers

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