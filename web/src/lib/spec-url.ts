/**
 * Spec URL Helper Library
 *
 * Handles dynamic spec URL patterns:
 * - 2 segments: /specs/{project}/{spec} when project and repo have same name
 * - 3 segments: /specs/{project}/{repo}/{spec} when they differ
 * - +1 segment: Optional file name (must end in .md)
 */

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

  // Check if last part is a file (ends with .md)
  if (
    parts.length > 0 &&
    parts[parts.length - 1].toLowerCase().endsWith(".md")
  ) {
    fileName = parts.pop();
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
