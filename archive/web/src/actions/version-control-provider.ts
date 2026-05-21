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

    // Return realistic file structure for detection to work
    const mockEntries: VCSEntry[] = [
      { name: "package.json", path: "package.json", type: "file" },
      { name: "Dockerfile", path: "Dockerfile", type: "file" },
      { name: "docker-compose.yml", path: "docker-compose.yml", type: "file" },
      { name: "README.md", path: "README.md", type: "file" },
      { name: ".gitignore", path: ".gitignore", type: "file" },
      { name: "tsconfig.json", path: "tsconfig.json", type: "file" },
      { name: "pnpm-lock.yaml", path: "pnpm-lock.yaml", type: "file" },
      { name: "src", path: "src", type: "dir" },
      { name: "web", path: "web", type: "dir" },
      { name: "operator", path: "operator", type: "dir" },
    ];

    return { success: true, entries: mockEntries };
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
    console.log("[VCS] readFile: Returning mocked data for", path);

    // Return realistic file content based on requested file
    if (path === "package.json" || path.endsWith("/package.json")) {
      const mockPackageJson = {
        name: "catalyst",
        version: "1.0.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "eslint .",
          typecheck: "tsc --noEmit",
        },
        dependencies: {
          next: "^15.0.0",
          react: "^18.2.0",
          "react-dom": "^18.2.0",
        },
        packageManager: "pnpm@9.0.0",
      };

      return {
        success: true,
        file: {
          name: "package.json",
          path: path,
          content: JSON.stringify(mockPackageJson, null, 2),
          sha: "mock-sha-" + path.replace(/\//g, "-"),
          htmlUrl: `https://github.com/ncrmro/catalyst/blob/main/${path}`,
        },
      };
    }

    if (path === "Makefile" || path.endsWith("/Makefile")) {
      const mockMakefile = `
.PHONY: dev build test lint

dev:
\t@echo "Starting development server..."
\tnpm run dev

build:
\t@echo "Building application..."
\tnpm run build

test:
\t@echo "Running tests..."
\tnpm test

lint:
\t@echo "Running linter..."
\tnpm run lint
`;

      return {
        success: true,
        file: {
          name: "Makefile",
          path: path,
          content: mockMakefile,
          sha: "mock-sha-makefile",
          htmlUrl: `https://github.com/ncrmro/catalyst/blob/main/${path}`,
        },
      };
    }

    // File not found or not mocked
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
