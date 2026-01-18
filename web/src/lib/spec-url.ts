/**
 * Spec URL Helper Library
 *
 * Handles dynamic spec URL patterns:
 * - 2 segments: /specs/{project}/{spec} when project and repo have same name
 * - 3 segments: /specs/{project}/{repo}/{spec} when they differ
 * - +1 segment: Optional file name (must end in .md)
 */

/**
 * Validates that a file name is safe (no path traversal, only alphanumeric, dash, underscore, dot)
 */
function isValidFileName(fileName: string): boolean {
  // Only allow safe characters: alphanumeric, dash, underscore, dot
  // No path separators (/, \) or parent directory references (..)
  const safeFileNamePattern = /^[a-zA-Z0-9_\-\.]+$/;
  return safeFileNamePattern.test(fileName) && !fileName.includes("..");
}

/**
 * Parses catch-all slug array into spec route params.
 * - 2 segments: project and repo have same name (repo omitted from URL)
 * - 3 segments: project and repo differ
 *
 * @param slug - The catch-all slug array from [...slug] route
 * @returns Parsed route params with projectSlug, repoSlug (always resolved), specSlug, and optional fileName
 */
export function parseSpecSlug(slug: string[]): {
  projectSlug: string;
  repoSlug: string; // Always resolved (defaults to projectSlug if omitted)
  specSlug: string;
  fileName?: string;
} {
  const parts = [...slug];
  let fileName: string | undefined;

  // Check if last part is a file (ends with .md) and validate it
  if (
    parts.length > 0 &&
    parts[parts.length - 1].toLowerCase().endsWith(".md")
  ) {
    const potentialFileName = parts[parts.length - 1];
    if (isValidFileName(potentialFileName)) {
      fileName = parts.pop();
    }
    // If invalid, we leave it in parts and it will be treated as part of the spec path
  }

  if (parts.length === 2) {
    // Project and repo have same name, repo omitted from URL
    return {
      projectSlug: parts[0],
      repoSlug: parts[0],
      specSlug: parts[1],
      fileName,
    };
  }
  if (parts.length === 3) {
    // Project and repo differ
    return {
      projectSlug: parts[0],
      repoSlug: parts[1],
      specSlug: parts[2],
      fileName,
    };
  }
  throw new Error(
    `Invalid spec URL: expected 2-3 segments (excluding file), got ${parts.length}`,
  );
}

/**
 * Generates spec URL, omitting repoSlug when it matches projectSlug.
 *
 * @param projectSlug - The project slug
 * @param repoSlug - The repository slug
 * @param specSlug - The spec slug (e.g., "001-environments")
 * @param options - Optional parameters
 * @returns The constructed URL path with query string
 */
export function buildSpecUrl(
  projectSlug: string,
  repoSlug: string,
  specSlug: string,
  options?: {
    chat?: boolean;
    tab?: "tasks";
    file?: string;
  },
): string {
  // Validate file parameter if provided
  if (options?.file && !isValidFileName(options.file)) {
    throw new Error(
      `Invalid file name: "${options.file}". File names must only contain alphanumeric characters, dashes, underscores, and dots, with no path separators.`,
    );
  }

  // Omit repoSlug from URL when it matches projectSlug (cleaner URLs)
  let basePath =
    projectSlug === repoSlug
      ? `/specs/${projectSlug}/${encodeURIComponent(specSlug)}`
      : `/specs/${projectSlug}/${repoSlug}/${encodeURIComponent(specSlug)}`;

  if (options?.file) {
    basePath += `/${options.file}`;
  }

  const params = new URLSearchParams();
  if (options?.chat) params.set("chat", "1");
  if (options?.tab) params.set("tab", options.tab);

  return params.toString() ? `${basePath}?${params}` : basePath;
}
