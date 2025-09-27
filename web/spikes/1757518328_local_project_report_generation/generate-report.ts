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
import { PullRequest, Issue } from '../../src/types/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


interface Project {
  repos: string[];
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
  repositoryAnalysis: z.object({
    totalRepositories: z.number(),
    repositories: z.array(z.string()).describe('List of repositories in the project'),
    insights: z.array(z.string()).describe('Key insights about repository activity')
  }),
  issuesAnalysis: z.object({
    totalIssues: z.number(),
    openIssues: z.number(),
    closedIssues: z.number(),
    issuesByLabel: z.record(z.number()).describe('Count of issues by label'),
    issuesByRepository: z.record(z.number()).describe('Count of issues by repository'),
    oldestIssues: z.array(z.object({
      title: z.string(),
      repository: z.string(),
      age_days: z.number(),
      url: z.string(),
      labels: z.array(z.string())
    })).describe('Oldest unresolved issues'),
    insights: z.array(z.string()).describe('Key insights about issues')
  }),
  pullRequestsAnalysis: z.object({
    totalPRs: z.number(),
    openPRs: z.number(),
    closedPRs: z.number(),
    draftPRs: z.number(),
    readyPRs: z.number(),
    prsByAuthor: z.record(z.number()).describe('Count of PRs by author'),
    prsByRepository: z.record(z.number()).describe('Count of PRs by repository'),
    stalePRs: z.array(z.object({
      title: z.string(),
      repository: z.string(),
      author: z.string(),
      age_days: z.number(),
      url: z.string(),
      isDraft: z.boolean()
    })).describe('PRs that may need attention'),
    insights: z.array(z.string()).describe('Key insights about pull requests')
  }),
  recommendations: z.array(z.string()).describe('Actionable recommendations for the project'),
  nextSteps: z.array(z.string()).describe('Suggested next steps for project maintainers')
});

const SYSTEM_PROMPT = `You are a Project Report Generator that analyzes GitHub repository data to provide insights about development activity, issues, and pull requests for a specific project.

Your responsibilities include:
1. Analyzing project activity across all repositories in the project
2. Highlighting issues that need attention (old, high-priority, etc.)
3. Identifying pull requests that may be stale or need review
4. Providing actionable insights for project maintainers
5. Suggesting next steps to improve project health and development velocity

When generating reports:
- Focus on actionable insights rather than just data summaries
- Highlight potential bottlenecks or areas needing attention
- Consider the age of issues and PRs when making recommendations
- Look for patterns in labels, authors, and repository activity
- Keep recommendations specific and achievable for the project scope
- Consider the project as a cohesive unit across multiple repositories

The user will provide you with data for a specific project including its repositories, issues, and pull requests.`;

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

  const prompt = `Generate a comprehensive project report for the "${projectName}" project based on the following data:

PROJECT OVERVIEW:
- Project Name: ${projectName}
- Repositories: ${project.repos.join(', ')}
- Total Issues: ${project.issues.length} (${issueStats.open.length} open, ${issueStats.closed.length} closed)
- Total Pull Requests: ${project.pullRequests.length} (${prStats.draft.length} drafts, ${prStats.ready.length} ready, ${prStats.changesRequested.length} changes requested)

ISSUES DATA:
${JSON.stringify(project.issues, null, 2)}

PULL REQUESTS DATA:
${JSON.stringify(project.pullRequests, null, 2)}

Please analyze this project data and provide:
1. Repository activity analysis across all repos in the project
2. Issues analysis with focus on aging issues, patterns, and priority
3. Pull request analysis with attention to stale PRs and development velocity
4. Actionable recommendations for project improvement
5. Specific next steps for maintainers

Focus on insights that help improve:
- Development velocity and efficiency
- Issue resolution and prioritization
- Code review processes and PR management
- Overall project health and maintainability

Consider this project as a cohesive unit and provide recommendations that take into account the multi-repository nature of the project.`;

  const result = await generateObject({
    model,
    system: SYSTEM_PROMPT,
    prompt,
    schema: projectReportSchema,
  });

  return result.object;
}

function formatProjectReport(report: any): string {
  const formatList = (items: string[]) => items.map(item => `  - ${item}`).join('\n');
  const formatIssueTable = (items: any[]) => items.map(item => 
    `  - **${item.title}** (${item.repository}) - ${item.age_days} days old - [Link](${item.url})\n    Labels: ${item.labels.join(', ')}`
  ).join('\n');
  const formatPRTable = (items: any[]) => items.map(item => 
    `  - **${item.title}** by ${item.author} (${item.repository}) - ${item.age_days} days old${item.isDraft ? ' [DRAFT]' : ''} - [Link](${item.url})`
  ).join('\n');

  return `
# ${report.title}

**Project:** ${report.projectName}

## Executive Summary
${report.summary}

## Repository Analysis
**Total Repositories:** ${report.repositoryAnalysis.totalRepositories}

**Repositories in Project:**
${formatList(report.repositoryAnalysis.repositories)}

**Key Insights:**
${formatList(report.repositoryAnalysis.insights)}

## Issues Analysis
**Total Issues:** ${report.issuesAnalysis.totalIssues}
**Open Issues:** ${report.issuesAnalysis.openIssues}
**Closed Issues:** ${report.issuesAnalysis.closedIssues}

**Issues by Label:**
${Object.entries(report.issuesAnalysis.issuesByLabel).map(([label, count]) => `  - ${label}: ${count}`).join('\n')}

**Issues by Repository:**
${Object.entries(report.issuesAnalysis.issuesByRepository).map(([repo, count]) => `  - ${repo}: ${count}`).join('\n')}

**Oldest Issues Needing Attention:**
${formatIssueTable(report.issuesAnalysis.oldestIssues)}

**Key Insights:**
${formatList(report.issuesAnalysis.insights)}

## Pull Requests Analysis
**Total PRs:** ${report.pullRequestsAnalysis.totalPRs}
**Open PRs:** ${report.pullRequestsAnalysis.openPRs}
**Closed PRs:** ${report.pullRequestsAnalysis.closedPRs}
**Draft PRs:** ${report.pullRequestsAnalysis.draftPRs}
**Ready PRs:** ${report.pullRequestsAnalysis.readyPRs}

**PRs by Author:**
${Object.entries(report.pullRequestsAnalysis.prsByAuthor).map(([author, count]) => `  - ${author}: ${count}`).join('\n')}

**PRs by Repository:**
${Object.entries(report.pullRequestsAnalysis.prsByRepository).map(([repo, count]) => `  - ${repo}: ${count}`).join('\n')}

**Stale PRs Needing Attention:**
${formatPRTable(report.pullRequestsAnalysis.stalePRs)}

**Key Insights:**
${formatList(report.pullRequestsAnalysis.insights)}

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