#!/usr/bin/env tsx

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parse, stringify } from 'yaml';
import { getUserOctokit, fetchPullRequestsFromRepos, fetchIssuesFromRepos } from '../../src/lib/github.js';
import { PullRequest, Issue } from '../../src/actions/reports.js';
import { Octokit } from '@octokit/rest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Issue {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  author: string;
  labels: string[];
  url: string;
  repository: string;
  milestone: {
    id: number;
    number: number;
    title: string;
    state: string;
    due_on: string | null;
  } | null;
}

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

async function loadTemplate(): Promise<ProjectsConfig> {
  const templatePath = path.join(__dirname, 'projects.template.yml');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found at ${templatePath}`);
  }
  
  const yamlContent = fs.readFileSync(templatePath, 'utf-8');
  return parse(yamlContent) as ProjectsConfig;
}

async function saveProjectsConfig(config: ProjectsConfig): Promise<void> {
  const configPath = path.join(__dirname, 'projects.yml');
  const yamlContent = stringify(config, { indent: 2 });
  fs.writeFileSync(configPath, yamlContent, 'utf-8');
}

function getAllTemplateRepos(config: ProjectsConfig): string[] {
  return Object.values(config.projects).flatMap(project => project.repos);
}

async function fetchRepositoryInfo(octokit: Octokit, repoFullName: string): Promise<RepositoryInfo> {
  const [owner, repo] = repoFullName.split('/');
  
  console.log(`  Fetching repository info for ${repoFullName}...`);
  
  // Fetch basic repository information
  const { data: repoData } = await octokit.rest.repos.get({
    owner,
    repo,
  });
  
  // Fetch README content
  let readme: string | null = null;
  try {
    const { data: readmeData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'README.md',
    });
    
    if ('content' in readmeData && readmeData.content) {
      readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    }
  } catch (error) {
    console.log(`    No README.md found for ${repoFullName}`);
  }
  
  // Fetch recent commits
  const { data: commitsData } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    per_page: 10,
  });
  
  const recentCommits: CommitInfo[] = commitsData.map(commit => ({
    sha: commit.sha.substring(0, 7),
    message: commit.commit.message.split('\n')[0], // First line (summary)
    fullMessage: commit.commit.message, // Full commit message including body
    author: commit.commit.author?.name || 'Unknown',
    date: commit.commit.author?.date || '',
  }));
  
  // Fetch latest release
  let latestRelease: ReleaseInfo | null = null;
  try {
    const { data: releaseData } = await octokit.rest.repos.getLatestRelease({
      owner,
      repo,
    });
    
    latestRelease = {
      name: releaseData.name || releaseData.tag_name,
      tag: releaseData.tag_name,
      published_at: releaseData.published_at || '',
      body: releaseData.body || '',
    };
  } catch (error) {
    console.log(`    No releases found for ${repoFullName}`);
  }
  
  // Fetch milestones
  const { data: milestonesData } = await octokit.rest.issues.listMilestones({
    owner,
    repo,
    state: 'all', // Get both open and closed milestones
    per_page: 100,
  });
  
  const milestones: MilestoneInfo[] = milestonesData.map(milestone => ({
    id: milestone.id,
    number: milestone.number,
    title: milestone.title,
    description: milestone.description,
    state: milestone.state as 'open' | 'closed',
    created_at: milestone.created_at,
    updated_at: milestone.updated_at,
    due_on: milestone.due_on,
    open_issues: milestone.open_issues,
    closed_issues: milestone.closed_issues,
  }));
  
  if (milestones.length > 0) {
    console.log(`    Found ${milestones.length} milestones in ${repoFullName}`);
  }
  
  return {
    name: repoData.name,
    fullName: repoData.full_name,
    description: repoData.description,
    topics: repoData.topics || [],
    language: repoData.language,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    readme,
    recentCommits,
    latestRelease,
    milestones,
  };
}

function organizeDataByProject(config: ProjectsConfig, repositoryInfos: RepositoryInfo[], relevantPRs: PullRequest[], relevantIssues: Issue[]): void {
  for (const [projectName, project] of Object.entries(config.projects)) {
    // Add repository info for this project
    const projectRepoInfos = repositoryInfos.filter(repoInfo =>
      project.repos.some(repo => repo === repoInfo.fullName)
    );
    
    const projectPRs = relevantPRs.filter(pr =>
      project.repos.some(repo => {
        const [, repoName] = repo.split('/');
        return pr.repository === repoName;
      })
    );
    
    const projectIssues = relevantIssues.filter(issue =>
      project.repos.some(repo => {
        const [, repoName] = repo.split('/');
        return issue.repository === repoName;
      })
    );
    
    config.projects[projectName].repositoryInfo = projectRepoInfos;
    config.projects[projectName].pullRequests = projectPRs;
    config.projects[projectName].issues = projectIssues;
  }
}

async function fetchRealGitHubData(): Promise<void> {
  console.log('Loading clean template...');
  const config = await loadTemplate();
  
  // Get all repositories defined in template
  const templateRepos = getAllTemplateRepos(config);
  console.log(`Template repositories: ${templateRepos.join(', ')}`);
  
  // Get authenticated Octokit instance (PAT only for CLI usage)
  const octokit = await getUserOctokit('cli-user');
  
  console.log('Fetching repository information...');
  const repositoryInfos: RepositoryInfo[] = [];
  
  for (const repoFullName of templateRepos) {
    try {
      const repoInfo = await fetchRepositoryInfo(octokit, repoFullName);
      repositoryInfos.push(repoInfo);
      console.log(`    ✓ ${repoInfo.fullName}: ${repoInfo.description || 'No description'}`);
    } catch (error) {
      console.error(`    ✗ Failed to fetch info for ${repoFullName}:`, error instanceof Error ? error.message : error);
    }
  }
  
  console.log('Fetching real pull requests from specific repositories...');
  const allPRs = await fetchPullRequestsFromRepos(octokit, templateRepos);
  
  if (allPRs.length === 0) {
    console.warn('No pull requests found in template repositories. Make sure GITHUB_PAT is set and repositories have open PRs.');
  } else {
    console.log(`Found ${allPRs.length} total pull requests from template repositories`);
  }
  
  console.log('Fetching real issues from specific repositories...');
  const allIssues = await fetchIssuesFromRepos(octokit, templateRepos);
  
  if (allIssues.length === 0) {
    console.warn('No issues found in template repositories. Make sure GITHUB_PAT is set and repositories have issues.');
  } else {
    console.log(`Found ${allIssues.length} total issues from template repositories`);
  }
  
  // Organize data by project (no need to filter since we queried specific repos)
  organizeDataByProject(config, repositoryInfos, allPRs, allIssues);
  
  // Save the updated configuration
  console.log('Saving updated configuration...');
  await saveProjectsConfig(config);
  
  console.log('\nSummary:');
  for (const [projectName, project] of Object.entries(config.projects)) {
    console.log(`- ${projectName}: ${project.repositoryInfo.length} repositories, ${project.pullRequests.length} pull requests, ${project.issues.length} issues`);
    
    if (project.repositoryInfo.length > 0) {
      console.log('  Repositories:');
      project.repositoryInfo.forEach(repo => {
        console.log(`    - ${repo.fullName}: ${repo.description || 'No description'}`);
        console.log(`      Language: ${repo.language || 'Unknown'}, Stars: ${repo.stars}, Forks: ${repo.forks}`);
        if (repo.latestRelease) {
          console.log(`      Latest Release: ${repo.latestRelease.tag} (${repo.latestRelease.name})`);
        }
        console.log(`      Recent Commits: ${repo.recentCommits.length}`);
      });
    }
    
    if (project.pullRequests.length > 0) {
      console.log('  Pull Requests:');
      project.pullRequests.forEach(pr => {
        console.log(`    - "${pr.title}" (#${pr.number}) by ${pr.author} [${pr.status}]`);
      });
    }
    
    if (project.issues.length > 0) {
      console.log('  Issues:');
      project.issues.forEach(issue => {
        console.log(`    - "${issue.title}" (#${issue.number}) by ${issue.author} [${issue.state}]`);
      });
    }
  }
  
  console.log('\nEnhanced GitHub data fetch completed!');
}

async function main() {
  try {
    await fetchRealGitHubData();
  } catch (error) {
    console.error('Failed to fetch GitHub data:', error);
    process.exit(1);
  }
}

main();