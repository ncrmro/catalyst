"use server";

import { auth } from "@/auth";
import { fetchProjectById } from "@/actions/projects";
import { createConventionRule, getProjectConventionRules } from "@/models/conventions";
import { updateFile, createPullRequest } from "@/actions/vcs";
import { readFile } from "@/actions/version-control-provider";

export interface ConventionScaffoldResult {
  success: boolean;
  rulesCreated: number;
  prUrl?: string;
  error?: string;
}

export interface DriftReport {
  projectId: string;
  compliant: boolean;
  score: number;
  issues: {
    ruleId: string;
    ruleName: string;
    message: string;
    severity: "error" | "warning";
  }[];
}

const DEFAULT_CONVENTIONS = [
  {
    type: "lint",
    ruleName: "ESLint Standard",
    config: { preset: "standard", fix: true },
  },
  {
    type: "format",
    ruleName: "Prettier",
    config: { printWidth: 100, semi: true },
  },
  {
    type: "commit",
    ruleName: "Conventional Commits",
    config: { types: ["feat", "fix", "chore", "docs", "style", "refactor", "test"] },
  },
];

export async function scaffoldProjectConventions(
  projectId: string
): Promise<ConventionScaffoldResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, rulesCreated: 0, error: "Unauthorized" };
  }

  const project = await fetchProjectById(projectId);
  if (!project) {
    return { success: false, rulesCreated: 0, error: "Project not found" };
  }

  try {
    // 1. Create database rules
    let rulesCreated = 0;
    for (const rule of DEFAULT_CONVENTIONS) {
      await createConventionRule({
        projectId,
        ruleType: rule.type,
        ruleName: rule.ruleName,
        config: rule.config,
      });
      rulesCreated++;
    }

    // 2. Create scaffolding PR via VCS
    const repo = project.repositories[0]?.repo;
    let prUrl: string | undefined;

    if (repo) {
      const [owner, repoName] = repo.fullName.split("/");
      const branchName = "chore/scaffold-conventions";
      
      // Update/create config file
      await updateFile({
        owner,
        repo: repoName,
        path: ".catalyst/conventions.json",
        content: JSON.stringify({ conventions: DEFAULT_CONVENTIONS }, null, 2),
        message: "chore: scaffold project conventions",
        branch: branchName,
      });
      
      // Create PR
      try {
        const pr = await createPullRequest({
          owner,
          repo: repoName,
          title: "chore: scaffold project conventions",
          head: branchName,
          base: "main",
          body: "This PR scaffolds the initial project conventions configuration.\n\nAutomated by Catalyst Platform Agent.",
        });
        prUrl = pr.htmlUrl;
      } catch (prError) {
        // If PR creation fails (e.g., branch already exists/PR exists), log it but don't fail the whole action
        console.warn("Failed to create PR:", prError);
      }
    }

    return { success: true, rulesCreated, prUrl };
  } catch (error) {
    console.error("Error scaffolding conventions:", error);
    return { 
      success: false, 
      rulesCreated: 0, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function detectConventionDrift(
  projectId: string
): Promise<DriftReport | null> {
  const project = await fetchProjectById(projectId);
  if (!project) return null;

  const rules = await getProjectConventionRules(projectId);
  const repo = project.repositories[0]?.repo;

  if (!repo || rules.length === 0) {
    return {
      projectId,
      compliant: true,
      score: 100,
      issues: [],
    };
  }

  const issues: DriftReport["issues"] = [];

  // Check for .catalyst/conventions.json existence
  // This is a simplified check. Real implementation would check actual config files.
  const conventionsFile = await readFile(repo.fullName, ".catalyst/conventions.json");
  
  if (!conventionsFile.success) {
    issues.push({
      ruleId: "base-config",
      ruleName: "Base Configuration",
      message: "Missing .catalyst/conventions.json file",
      severity: "error",
    });
  }

  // TODO: Add more sophisticated drift detection based on rule types

  const score = Math.max(0, 100 - issues.length * 25);

  return {
    projectId,
    compliant: issues.length === 0,
    score,
    issues,
  };
}

export async function applyConventionFixes(
  projectId: string,
  driftReport: DriftReport
) {
  // TODO: Implement fix application logic
  // This would typically involve re-running the scaffold or applying specific patches
  console.log("Applying fixes for project", projectId, driftReport);
  
  return scaffoldProjectConventions(projectId);
}