"use server";

import { auth } from "@/auth";
import { providerRegistry, refreshTokenIfNeeded } from "@/lib/vcs-providers";

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

  // Refresh tokens before accessing repository to ensure valid GitHub access
  try {
    await refreshTokenIfNeeded(session.user.id);
  } catch (error) {
    console.error(
      "[VCS] Failed to refresh tokens before listing directory:",
      error,
    );
    // Continue anyway - provider.authenticate will attempt refresh again
  }

  try {
    const [owner, repo] = repoFullName.split("/");
    console.log(`[VCS] listDirectory: owner=${owner}, repo=${repo}`);

    const provider = providerRegistry.getDefault();
    const client = await provider.authenticate(session.user.id);
    const directoryEntries = await provider.getDirectoryContent(
      client,
      owner,
      repo,
      path,
      ref,
    );

    // Empty result means either empty directory or path doesn't exist
    // The provider returns [] for both cases
    const entries: VCSEntry[] = directoryEntries.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type === "dir" ? "dir" : "file", // Map submodule/symlink to file
    }));

    console.log(`[VCS] listDirectory: Found ${entries.length} entries`);
    return { success: true, entries };
  } catch (error) {
    const statusCode = (error as { status?: number })?.status;
    console.error("[VCS] listDirectory error:", {
      path: `${repoFullName}/${path}`,
      ref,
      statusCode,
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

  // Refresh tokens before reading file to ensure valid GitHub access
  try {
    await refreshTokenIfNeeded(session.user.id);
  } catch (error) {
    console.error("[VCS] Failed to refresh tokens before reading file:", error);
    // Continue anyway - provider.authenticate will attempt refresh again
  }

  try {
    const [owner, repo] = repoFullName.split("/");
    const provider = providerRegistry.getDefault();
    const client = await provider.authenticate(session.user.id);
    const fileContent = await provider.getFileContent(
      client,
      owner,
      repo,
      path,
      ref,
    );

    if (!fileContent) {
      return { success: true, file: null }; // File doesn't exist or is not a file
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
    const statusCode = (error as { status?: number })?.status;
    console.error("[VCS] readFile error:", {
      path: `${repoFullName}/${path}`,
      ref,
      statusCode,
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
