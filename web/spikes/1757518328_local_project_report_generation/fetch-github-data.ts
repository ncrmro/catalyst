#!/usr/bin/env tsx

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { parse, stringify } from "yaml";
import {
  getUserOctokit,
  fetchPullRequestsFromRepos,
  fetchIssuesFromRepos,
} from "../../src/lib/github.js";
import { PullRequest, Issue } from "../../src/actions/reports.js";

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

async function loadTemplate(): Promise<ProjectsConfig> {
  const templatePath = path.join(__dirname, "projects.template.yml");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found at ${templatePath}`);
  }

  const yamlContent = fs.readFileSync(templatePath, "utf-8");
  return parse(yamlContent) as ProjectsConfig;
}

async function saveProjectsConfig(config: ProjectsConfig): Promise<void> {
  const configPath = path.join(__dirname, "projects.yml");
  const yamlContent = stringify(config, { indent: 2 });
  fs.writeFileSync(configPath, yamlContent, "utf-8");
}

function getAllTemplateRepos(config: ProjectsConfig): string[] {
  return Object.values(config.projects).flatMap((project) => project.repos);
}

function organizeDataByProject(
  config: ProjectsConfig,
  relevantPRs: PullRequest[],
  relevantIssues: Issue[],
): void {
  for (const [projectName, project] of Object.entries(config.projects)) {
    const projectPRs = relevantPRs.filter((pr) =>
      project.repos.some((repo) => {
        const [, repoName] = repo.split("/");
        return pr.repository === repoName;
      }),
    );

    const projectIssues = relevantIssues.filter((issue) =>
      project.repos.some((repo) => {
        const [, repoName] = repo.split("/");
        return issue.repository === repoName;
      }),
    );

    config.projects[projectName].pullRequests = projectPRs;
    config.projects[projectName].issues = projectIssues;
  }
}

async function fetchRealGitHubData(): Promise<void> {
  console.log("Loading clean template...");
  const config = await loadTemplate();

  // Get all repositories defined in template
  const templateRepos = getAllTemplateRepos(config);
  console.log(`Template repositories: ${templateRepos.join(", ")}`);

  // Get authenticated Octokit instance (PAT only for CLI usage)
  const octokit = await getUserOctokit("cli-user");

  console.log("Fetching real pull requests from specific repositories...");
  const allPRs = await fetchPullRequestsFromRepos(octokit, templateRepos);

  if (allPRs.length === 0) {
    console.warn(
      "No pull requests found in template repositories. Make sure GITHUB_PAT is set and repositories have open PRs.",
    );
  } else {
    console.log(
      `Found ${allPRs.length} total pull requests from template repositories`,
    );
  }

  console.log("Fetching real issues from specific repositories...");
  const allIssues = await fetchIssuesFromRepos(octokit, templateRepos);

  if (allIssues.length === 0) {
    console.warn(
      "No issues found in template repositories. Make sure GITHUB_PAT is set and repositories have issues.",
    );
  } else {
    console.log(
      `Found ${allIssues.length} total issues from template repositories`,
    );
  }

  // Organize data by project (no need to filter since we queried specific repos)
  organizeDataByProject(config, allPRs, allIssues);

  // Save the updated configuration
  console.log("Saving updated configuration...");
  await saveProjectsConfig(config);

  console.log("\nSummary:");
  for (const [projectName, project] of Object.entries(config.projects)) {
    console.log(
      `- ${projectName}: ${project.pullRequests.length} pull requests, ${project.issues.length} issues`,
    );

    if (project.pullRequests.length > 0) {
      console.log("  Pull Requests:");
      project.pullRequests.forEach((pr) => {
        console.log(
          `    - "${pr.title}" (#${pr.number}) by ${pr.author} [${pr.status}]`,
        );
      });
    }

    if (project.issues.length > 0) {
      console.log("  Issues:");
      project.issues.forEach((issue) => {
        console.log(
          `    - "${issue.title}" (#${issue.number}) by ${issue.author} [${issue.state}]`,
        );
      });
    }
  }

  console.log("\nReal GitHub data fetch completed!");
}

async function main() {
  try {
    await fetchRealGitHubData();
  } catch (error) {
    console.error("Failed to fetch GitHub data:", error);
    process.exit(1);
  }
}

main();
