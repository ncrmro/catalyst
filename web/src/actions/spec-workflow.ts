"use server";

import { auth } from "@/auth";
import { fetchProjectById } from "@/actions/projects";
import { readFile, listDirectory } from "@/actions/version-control-provider";
import { updateFile, createPullRequest, createBranch } from "@/actions/vcs";
import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

export interface SpecAnalysisProposal {
  projectId: string;
  projectSlug: string;
  existingSpecs: boolean;
  proposedFiles: {
    path: string;
    description: string;
  }[];
  projectType: string;
}

// Hardcoded templates (read from specs/.templates/ in this repo)
const TEMPLATES = {
  "AGENTS.md": `# Specification Process

Specs define features through user stories, keeping development focused on user value. Each spec lives in a numbered directory and serves as documentation for agents and developers.

## Directory Structure

\`\`\`
specs/
├── AGENTS.md              # This file
├── .templates/            # Template files
│   ├── spec.md
│   ├── plan.md
│   ├── quickstart.md
│   ├── tasks.md
│   └── research.md
└── ###-spec-slug/         # Individual specs
    ├── spec.md
    ├── plan.md
    ├── quickstart.md
    ├── tasks.md
    └── research*.md
\`\`\`

## Workflow

1. **spec.md** - Define user stories (P1/P2/P3), requirements (FR-###), success criteria (SC-###)
2. **plan.md** - Design implementation: schema, actions, components, spikes
3. **tasks.md** - Break down into phases, UI-first approach

## Registering Specs

Specs must be referenced in the root 
AGENTS.md
.
`,
  "spec.md": `# Feature Specification: [FEATURE NAME]

**Spec**: 
###-feature-slug
**Status**: Draft

## User Stories

### US-1: [Title] (P1)
[Description]

**Acceptance Criteria**:
1. **Given** [state], **When** [action], **Then** [outcome]
`,
  "plan.md": `# Implementation Plan

## Summary
[Approach]

## Data Model
\`\`\`typescript
// Schema
\`\`\`
`,
  "tasks.md": `# Tasks

## Phase 1: Setup
- [ ] T001 Task
`,
  "quickstart.md": `# Quickstart

## Setup
\`\`\`bash
npm install
\`\`\`
`,
  "research.md": `# Research
`
};

export async function analyzeRepoForSpecs(projectId: string): Promise<SpecAnalysisProposal> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await fetchProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const repo = project.repositories[0]?.repo;
  if (!repo) throw new Error("Repository not found");

  // Check if specs folder exists
  const specsDir = await listDirectory(repo.fullName, "specs");
  const existingSpecs = specsDir.success && specsDir.entries.length > 0;

  // Check for project type indicators
  let projectType = "Unknown";
  const packageJson = await readFile(repo.fullName, "package.json");
  const goMod = await readFile(repo.fullName, "go.mod");
  
  if (packageJson.success) {
    projectType = "Node.js/JavaScript";
  } else if (goMod.success) {
    projectType = "Go";
  }

  // Propose files
  const proposedFiles = [
    {
      path: "specs/AGENTS.md",
      description: "Root spec index and documentation for agents"
    },
    {
      path: "specs/.templates/spec.md",
      description: "Feature specification template"
    },
    {
      path: "specs/.templates/plan.md",
      description: "Implementation plan template"
    },
    {
      path: "specs/.templates/tasks.md",
      description: "Task breakdown template"
    },
    {
      path: "specs/.templates/quickstart.md",
      description: "Developer onboarding template"
    },
    {
      path: "specs/.templates/research.md",
      description: "Research documentation template"
    }
  ];

  return {
    projectId,
    projectSlug: project.slug,
    existingSpecs,
    proposedFiles,
    projectType
  };
}

export async function bootstrapSpecs(
  projectId: string,
): Promise<{ success: boolean; prUrl?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const project = await fetchProjectById(projectId);
  if (!project) return { success: false, error: "Project not found" };

  const repo = project.repositories[0]?.repo;
  if (!repo) return { success: false, error: "Repository not found" };

  const [owner, repoName] = repo.fullName.split("/");
  const branchName = `chore/bootstrap-specs-${Date.now()}`;

  try {
    // Create branch
    await createBranch({
      owner,
      repo: repoName,
      name: branchName,
      fromBranch: "main", // Assuming main
    });

    // 1. Create AGENTS.md
    await updateFile({
      owner,
      repo: repoName,
      path: "specs/AGENTS.md",
      content: TEMPLATES["AGENTS.md"],
      message: "docs: add specs/AGENTS.md",
      branch: branchName,
    });

    // 2. Create templates
    const templates = [
      { name: "spec.md", content: TEMPLATES["spec.md"] },
      { name: "plan.md", content: TEMPLATES["plan.md"] },
      { name: "tasks.md", content: TEMPLATES["tasks.md"] },
      { name: "quickstart.md", content: TEMPLATES["quickstart.md"] },
      { name: "research.md", content: TEMPLATES["research.md"] },
    ];

    for (const tmpl of templates) {
      await updateFile({
        owner,
        repo: repoName,
        path: `specs/.templates/${tmpl.name}`,
        content: tmpl.content,
        message: `docs: add specs template ${tmpl.name}`,
        branch: branchName,
      });
    }

    // 3. Create PR
    const pr = await createPullRequest({
      owner,
      repo: repoName,
      title: "chore: bootstrap spec-driven development",
      head: branchName,
      base: "main",
      body: "This PR sets up the directory structure and templates for Spec-Driven Development.\n\nSee `specs/AGENTS.md` for details on the workflow.",
    });

    revalidatePath(`/projects/${project.slug}/specs/workflow`);

    return { success: true, prUrl: pr.htmlUrl };
  } catch (error) {
    console.error("Error bootstrapping specs:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function distillSpec(
  projectId: string,
  description: string,
  filePaths: string[]
): Promise<{ success: boolean; specContent?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const project = await fetchProjectById(projectId);
  if (!project) return { success: false, error: "Project not found" };

  const repo = project.repositories[0]?.repo;
  if (!repo) return { success: false, error: "Repository not found" };

  // 1. Read files
  const fileContents: { path: string; content: string }[] = [];
  for (const path of filePaths) {
    const result = await readFile(repo.fullName, path);
    if (result.success && result.file?.content) {
      fileContents.push({
        path,
        content: result.file.content
      });
    }
  }

  // 2. Prepare Prompt
  const prompt = `
You are an expert software architect. Your task is to write a Feature Specification (spec.md) based on existing code.

**Context:**
${description}

**Files:**
${fileContents.map(f => `--- ${f.path} ---
${f.content}
`).join("\n")} 

**Output Format:**
Please generate a standard spec.md using the following structure:
- Title & Summary
- User Stories (Reverse engineered from code)
- Functional Requirements
- Data Model (Inferred)
- API/Actions (Inferred)

Keep it concise and high-quality. Return ONLY the markdown content.
`;

  try {
    // 3. Call LLM
    const model = process.env.ANTHROPIC_API_KEY 
      ? anthropic("claude-3-5-sonnet-20240620")
      : process.env.OPENAI_API_KEY 
        ? openai("gpt-4o") 
        : null;

    if (!model) {
      return { success: false, error: "No AI provider configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)" };
    }

    const { text } = await generateText({
      model,
      prompt,
    });

    return {
      success: true,
      specContent: text
    };
  } catch (error) {
    console.error("AI Generation failed:", error);
    return { success: false, error: "Failed to generate spec. Check API keys and logs." };
  }
}
