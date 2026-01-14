"use server";

import { auth } from "@/auth";
import { vcs } from "@/lib/vcs";
import { GITHUB_CONFIG } from "@/lib/vcs-providers";

// Types
export interface VCSEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface VCSFile {
  name: string;
  path: string;
  content: string;
  sha: string;
  htmlUrl: string;
}

export interface VCSDirectoryResult {
  success: boolean;
  entries: VCSEntry[];
  error?: string;
}

export interface VCSFileResult {
  success: boolean;
  file: VCSFile | null;
  error?: string;
}

/**
 * List directory contents from a repository
 */
export async function listDirectory(
  repoFullName: string,
  path: string,
  ref: string = "main",
): Promise<VCSDirectoryResult> {
  console.log(`[VCS] listDirectory: ${repoFullName}/${path} @ ${ref}`);

  const session = await auth();
  if (!session?.user?.id) {
    console.log("[VCS] listDirectory: Not authenticated");
    return { success: false, entries: [], error: "Not authenticated" };
  }

  // Handle Mocked Mode
  if (GITHUB_CONFIG.REPOS_MODE === "mocked") {
    console.log("[VCS] listDirectory: Returning mocked data");
    
    // Mock directory listings for specs
    if (path === "specs") {
      return {
        success: true,
        entries: [
          { name: "001-environments", path: "specs/001-environments", type: "dir" },
          { name: "003-vcs-providers", path: "specs/003-vcs-providers", type: "dir" },
          { name: "006-agent-harness", path: "specs/006-agent-harness", type: "dir" },
          { name: "007-agents", path: "specs/007-agents", type: "dir" },
          { name: "009-projects", path: "specs/009-projects", type: "dir" },
          { name: "010-platform", path: "specs/010-platform", type: "dir" },
        ],
      };
    }
    
    // Mock spec directory contents
    if (path.startsWith("specs/")) {
      const specName = path.replace("specs/", "");
      
      // Return different files based on which spec directory
      const mockFiles: Record<string, VCSEntry[]> = {
        "001-environments": [
          { name: "spec.md", path: "specs/001-environments/spec.md", type: "file" },
          { name: "tasks.md", path: "specs/001-environments/tasks.md", type: "file" },
          { name: "plan.md", path: "specs/001-environments/plan.md", type: "file" },
          { name: "research.md", path: "specs/001-environments/research.md", type: "file" },
        ],
        "003-vcs-providers": [
          { name: "spec.md", path: "specs/003-vcs-providers/spec.md", type: "file" },
          { name: "tasks.md", path: "specs/003-vcs-providers/tasks.md", type: "file" },
        ],
        "006-agent-harness": [
          { name: "spec.md", path: "specs/006-agent-harness/spec.md", type: "file" },
          { name: "plan.md", path: "specs/006-agent-harness/plan.md", type: "file" },
        ],
        "007-agents": [
          { name: "spec.md", path: "specs/007-agents/spec.md", type: "file" },
          { name: "tasks.md", path: "specs/007-agents/tasks.md", type: "file" },
        ],
        "009-projects": [
          { name: "spec.md", path: "specs/009-projects/spec.md", type: "file" },
          { name: "tasks.md", path: "specs/009-projects/tasks.md", type: "file" },
          { name: "plan.md", path: "specs/009-projects/plan.md", type: "file" },
        ],
        "010-platform": [
          { name: "spec.md", path: "specs/010-platform/spec.md", type: "file" },
          { name: "README.md", path: "specs/010-platform/README.md", type: "file" },
        ],
      };
      
      return {
        success: true,
        entries: mockFiles[specName] || [],
      };
    }
    
    return { success: true, entries: [] };
  }

  try {
    const [owner, repo] = repoFullName.split("/");
    console.log(`[VCS] listDirectory: owner=${owner}, repo=${repo}`);

    const scopedVcs = vcs.getScoped(session.user.id);
    const directoryEntries = await scopedVcs.files.getDirectory(
      owner,
      repo,
      path,
      ref,
    );

    const entries: VCSEntry[] = directoryEntries.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "dir" ? "dir" : "file",
    }));

    console.log(`[VCS] listDirectory: Found ${entries.length} entries`);
    return { success: true, entries };
  } catch (error) {
    console.error("[VCS] listDirectory error:", {
      path: `${repoFullName}/${path}`,
      ref,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      entries: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Read file contents from a repository
 */
export async function readFile(
  repoFullName: string,
  path: string,
  ref: string = "main",
): Promise<VCSFileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, file: null, error: "Not authenticated" };
  }

  // Handle Mocked Mode
  if (GITHUB_CONFIG.REPOS_MODE === "mocked") {
    console.log("[VCS] readFile: Returning mocked data");
    
    // Mock spec file content
    if (path.includes("spec.md")) {
      const pathParts = path.split("/");
      const specName = pathParts.length > 1 ? pathParts[1] : "unknown"; // Extract spec name from path like "specs/001-environments/spec.md"
      
      const mockContent = `# ${specName}

## Overview

This is a mock specification document for ${specName}.

## User Stories

- As a developer, I want to use this feature
- As a user, I want to benefit from this feature

## Technical Details

Mock technical details for development and testing.

## Implementation Plan

1. Planning phase
2. Development phase
3. Testing phase
4. Deployment phase
`;
      
      return {
        success: true,
        file: {
          name: "spec.md",
          path,
          content: mockContent,
          sha: `mock-sha-${path.replace(/\//g, "-")}-${Date.now()}`,
          htmlUrl: `https://github.com/${repoFullName}/blob/main/${path}`,
        },
      };
    }
    
    // Mock other markdown files
    if (path.endsWith(".md")) {
      const fileName = path.split("/").pop() || "file.md";
      const mockContent = `# ${fileName.replace(".md", "")}

This is mock content for ${fileName}.

## Section 1

Mock content section.

## Section 2

More mock content.
`;
      
      return {
        success: true,
        file: {
          name: fileName,
          path,
          content: mockContent,
          sha: `mock-sha-${path.replace(/\//g, "-")}-${Date.now()}`,
          htmlUrl: `https://github.com/${repoFullName}/blob/main/${path}`,
        },
      };
    }
    
    return { success: true, file: null };
  }

  try {
    const [owner, repo] = repoFullName.split("/");
    const scopedVcs = vcs.getScoped(session.user.id);
    const fileContent = await scopedVcs.files.getContent(
      owner,
      repo,
      path,
      ref,
    );

    if (!fileContent) {
      return { success: true, file: null };
    }

    return {
      success: true,
      file: {
        name: fileContent.name,
        path: fileContent.path,
        content: fileContent.content,
        sha: fileContent.sha,
        htmlUrl: fileContent.htmlUrl,
      },
    };
  } catch (error) {
    console.error("[VCS] readFile error:", {
      path: `${repoFullName}/${path}`,
      ref,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      file: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a directory exists in a repository
 */
export async function directoryExists(
  repoFullName: string,
  path: string,
  ref: string = "main",
): Promise<boolean> {
  const result = await listDirectory(repoFullName, path, ref);
  return result.success && !result.error;
}
