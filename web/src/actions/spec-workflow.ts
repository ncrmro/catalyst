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

// Hardcoded templates
const TEMPLATES = {
  "AGENTS.md": "# Specification Process\n\nSpecs define features through user stories, keeping development focused on user value. Each spec lives in a numbered directory and serves as documentation for agents and developers.\n\n## Directory Structure\n\n```\nspecs/\n├── AGENTS.md              # This file\n├── .templates/            # Template files\n│   ├── spec.md\n│   ├── plan.md\n│   ├── quickstart.md\n│   ├── tasks.md\n│   └── research.md\n└── ###-spec-slug/         # Individual specs\n    ├── spec.md\n    ├── plan.md\n    ├── quickstart.md\n    ├── tasks.md\n    └── research*.md\n```\n\n## Workflow\n\n1. **spec.md** - Define user stories (P1/P2/P3), requirements (FR-###), success criteria (SC-###)\n2. **plan.md** - Design implementation: schema, actions, components, spikes\n3. **tasks.md** - Break down into phases, UI-first approach\n\n## Registering Specs\n\nSpecs must be referenced in the root `AGENTS.md`.\n",
  "spec.md": "# Feature Specification: [FEATURE NAME]\n\n**Spec**: `###-feature-slug`\n**Status**: Draft\n\n## User Stories\n\n### US-1: [Title] (P1)\n[Description]\n\n**Acceptance Criteria**:\n1. **Given** [state], **When** [action], **Then** [outcome]\n",
  "plan.md": "# Implementation Plan\n\n## Summary\n[Approach]\n\n## Data Model\n```typescript\n// Schema\n```\n",
  "tasks.md": "# Tasks\n\n## Phase 1: Setup\n- [ ] T001 Task\n",
  "quickstart.md": "# Quickstart\n\n## Setup\n```bash\nnpm install\n```\n",
  "research.md": "# Research\n"
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

  const specsDir = await listDirectory(repo.fullName, "specs");
  const existingSpecs = specsDir.success && specsDir.entries.length > 0;

  let projectType = "Unknown";
  const packageJson = await readFile(repo.fullName, "package.json");
  const goMod = await readFile(repo.fullName, "go.mod");
  
  if (packageJson.success) {
    projectType = "Node.js/JavaScript";
  } else if (goMod.success) {
    projectType = "Go";
  }

  const proposedFiles = [
    { path: "specs/AGENTS.md", description: "Root spec index and documentation for agents" },
    { path: "specs/.templates/spec.md", description: "Feature specification template" },
    { path: "specs/.templates/plan.md", description: "Implementation plan template" },
    { path: "specs/.templates/tasks.md", description: "Task breakdown template" },
    { path: "specs/.templates/quickstart.md", description: "Developer onboarding template" },
    { path: "specs/.templates/research.md", description: "Research documentation template" }
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
    await createBranch({
      owner,
      repo: repoName,
      name: branchName,
      fromBranch: "main",
    });

    await updateFile({
      owner,
      repo: repoName,
      path: "specs/AGENTS.md",
      content: TEMPLATES["AGENTS.md"],
      message: "docs: add specs/AGENTS.md",
      branch: branchName,
    });

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

export async function generateSpecFromDescription(
  projectId: string,
  description: string
): Promise<{ success: boolean; specContent?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const project = await fetchProjectById(projectId);
  if (!project) return { success: false, error: "Project not found" };

  const prompt = `
You are an expert software architect. Your task is to write a Feature Specification (spec.md) for a new feature.

**Feature Description:**
${description}

**Output Format:**
Please generate a standard spec.md using the following structure:
- Title & Summary
- User Stories
- Functional Requirements
- Success Criteria

Keep it concise and high-quality. Return ONLY the markdown content.
`;

  try {
    const model = process.env.ANTHROPIC_API_KEY 
      ? anthropic("claude-3-5-sonnet-20240620")
      : process.env.OPENAI_API_KEY 
        ? openai("gpt-4o") 
        : null;

    if (!model) {
      return { success: false, error: "No AI provider configured" };
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
    return { success: false, error: "Failed to generate spec." };
  }
}

export async function amendSpec(
  projectId: string,
  specPath: string,
  changes: string
): Promise<{ success: boolean; specContent?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const project = await fetchProjectById(projectId);
  if (!project) return { success: false, error: "Project not found" };

  const repo = project.repositories[0]?.repo;
  if (!repo) return { success: false, error: "Repository not found" };

  const currentSpec = await readFile(repo.fullName, specPath);
  if (!currentSpec.success || !currentSpec.file) {
    return { success: false, error: "Could not read existing spec." };
  }

  const prompt = `
You are an expert software architect. Your task is to update an existing Feature Specification (spec.md).

**Current Spec:**
${currentSpec.file.content}

**Requested Changes:**
${changes}

**Instructions:**
Apply the requested changes to the current spec while maintaining its structure and quality.
Return ONLY the updated markdown content.
`;

  try {
    const model = process.env.ANTHROPIC_API_KEY 
      ? anthropic("claude-3-5-sonnet-20240620")
      : process.env.OPENAI_API_KEY 
        ? openai("gpt-4o") 
        : null;

    if (!model) {
      return { success: false, error: "No AI provider configured" };
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
    console.error("AI Amendment failed:", error);
    return { success: false, error: "Failed to amend spec." };
  }
}

export async function addCodeAnnotations(
  projectId: string,
  specPath: string
): Promise<{ success: boolean; annotations?: { filePath: string; line: number; frId: string; suggestion: string }[]; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const project = await fetchProjectById(projectId);
  if (!project) return { success: false, error: "Project not found" };

  const repo = project.repositories[0]?.repo;
  if (!repo) return { success: false, error: "Repository not found" };

  const specRes = await readFile(repo.fullName, specPath);
  if (!specRes.success || !specRes.file) return { success: false, error: "Could not read spec." };

  return {
    success: true,
    annotations: [
      { filePath: "src/lib/auth.ts", line: 12, frId: "FR-001", suggestion: "// FR-001: Implements user authentication logic" },
      { filePath: "src/db/schema.ts", line: 45, frId: "FR-004", suggestion: "// FR-004: Defines the user table schema" }
    ]
  };
}
