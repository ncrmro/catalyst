#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parse, stringify } from 'yaml';

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
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  created_at: string;
  updated_at: string;
  author: string;
  labels: string[];
  url: string;
  repository: string;
  base_branch: string;
  head_branch: string;
}

interface Repository {
  issues: Issue[];
  pullRequests: PullRequest[];
}

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

// Generate fake issues for a repository
function generateFakeIssues(repoName: string, count: number = 3): Issue[] {
  const issues: Issue[] = [];
  const titles = [
    'Fix memory leak in data processing',
    'Add dark mode support',
    'Improve error handling in API calls',
    'Update dependencies to latest versions',
    'Add unit tests for core functionality',
    'Performance optimization for large datasets',
    'Documentation updates needed',
    'Bug: Application crashes on startup'
  ];

  const labels = [
    ['bug', 'high-priority'],
    ['enhancement', 'ui/ux'],
    ['bug', 'medium-priority'],
    ['maintenance', 'dependencies'],
    ['testing', 'quality'],
    ['performance', 'optimization'],
    ['documentation'],
    ['bug', 'critical']
  ];

  const authors = ['ncrmro', 'contributor1', 'developer2', 'maintainer'];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - daysAgo);
    
    const updatedDate = new Date(createdDate);
    updatedDate.setDate(updatedDate.getDate() + Math.floor(Math.random() * daysAgo));

    issues.push({
      id: 1000 + i,
      number: 100 + i,
      title: titles[i % titles.length],
      state: Math.random() > 0.8 ? 'closed' : 'open',
      created_at: createdDate.toISOString(),
      updated_at: updatedDate.toISOString(),
      author: authors[Math.floor(Math.random() * authors.length)],
      labels: labels[i % labels.length],
      url: `https://github.com/${repoName}/issues/${100 + i}`,
      repository: repoName,
    });
  }

  return issues;
}

// Generate fake pull requests for a repository
function generateFakePullRequests(repoName: string, count: number = 2): PullRequest[] {
  const pullRequests: PullRequest[] = [];
  const titles = [
    'Implement user authentication system',
    'Add responsive design for mobile',
    'Refactor database queries for performance',
    'Add integration with external API',
    'Fix UI inconsistencies in dashboard',
    'Update build pipeline configuration'
  ];

  const authors = ['ncrmro', 'contributor1', 'developer2'];
  const branches = ['feature/auth', 'feature/mobile', 'perf/db-queries', 'feature/api', 'fix/ui-dashboard', 'ci/build-update'];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 14) + 1;
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - daysAgo);
    
    const updatedDate = new Date(createdDate);
    updatedDate.setDate(updatedDate.getDate() + Math.floor(Math.random() * daysAgo));

    pullRequests.push({
      id: 2000 + i,
      number: 200 + i,
      title: titles[i % titles.length],
      state: Math.random() > 0.7 ? 'closed' : 'open',
      draft: Math.random() > 0.7,
      created_at: createdDate.toISOString(),
      updated_at: updatedDate.toISOString(),
      author: authors[Math.floor(Math.random() * authors.length)],
      labels: i % 2 === 0 ? ['feature'] : ['bugfix'],
      url: `https://github.com/${repoName}/pull/${200 + i}`,
      repository: repoName,
      base_branch: 'main',
      head_branch: branches[i % branches.length],
    });
  }

  return pullRequests;
}

async function loadProjectsConfig(): Promise<ProjectsConfig> {
  const configPath = path.join(__dirname, 'projects.yml');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Projects config file not found at ${configPath}`);
  }
  
  const yamlContent = fs.readFileSync(configPath, 'utf-8');
  return parse(yamlContent) as ProjectsConfig;
}

async function saveProjectsConfig(config: ProjectsConfig): Promise<void> {
  const configPath = path.join(__dirname, 'projects.yml');
  const yamlContent = stringify(config, { indent: 2 });
  fs.writeFileSync(configPath, yamlContent, 'utf-8');
}

async function fetchGitHubData(): Promise<void> {
  console.log('Loading projects configuration...');
  const config = await loadProjectsConfig();
  
  console.log('Generating fake GitHub data for projects...');
  
  for (const [projectName, project] of Object.entries(config.projects)) {
    console.log(`\nProcessing project: ${projectName}`);
    
    const allIssues: Issue[] = [];
    const allPullRequests: PullRequest[] = [];
    
    for (const repoName of project.repos) {
      console.log(`  Generating data for repository: ${repoName}`);
      
      // Generate fake issues and PRs for this repository
      const issues = generateFakeIssues(repoName, 3);
      const pullRequests = generateFakePullRequests(repoName, 2);
      
      allIssues.push(...issues);
      allPullRequests.push(...pullRequests);
      
      console.log(`    Generated ${issues.length} issues and ${pullRequests.length} pull requests`);
    }
    
    // Update the project with the generated data
    config.projects[projectName].issues = allIssues;
    config.projects[projectName].pullRequests = allPullRequests;
  }
  
  console.log('\nSaving updated configuration...');
  await saveProjectsConfig(config);
  
  console.log('\nSummary:');
  for (const [projectName, project] of Object.entries(config.projects)) {
    console.log(`- ${projectName}: ${project.issues.length} issues, ${project.pullRequests.length} pull requests`);
  }
  
  console.log('\nFake GitHub data generation completed!');
}

async function main() {
  try {
    await fetchGitHubData();
  } catch (error) {
    console.error('Failed to fetch GitHub data:', error);
    process.exit(1);
  }
}

main();