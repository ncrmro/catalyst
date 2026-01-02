/**
 * Spec URL Helper Library
 *
 * Handles dynamic spec URL patterns:
 * - 2 segments: /specs/{project}/{spec} when project and repo have same name
 * - 3 segments: /specs/{project}/{repo}/{spec} when they differ
 */

/**
 * Parses catch-all slug array into spec route params.
 * - 2 segments: project and repo have same name (repo omitted from URL)
 * - 3 segments: project and repo differ
 *
 * @param slug - The catch-all slug array from [...slug] route
 * @returns Parsed route params with projectSlug, repoSlug (always resolved), and specSlug
 */
export function parseSpecSlug(slug: string[]): {
	projectSlug: string;
	repoSlug: string; // Always resolved (defaults to projectSlug if omitted)
	specSlug: string;
} {
	if (slug.length === 2) {
		// Project and repo have same name, repo omitted from URL
		return { projectSlug: slug[0], repoSlug: slug[0], specSlug: slug[1] };
	}
	if (slug.length === 3) {
		// Project and repo differ
		return { projectSlug: slug[0], repoSlug: slug[1], specSlug: slug[2] };
	}
	throw new Error(
		`Invalid spec URL: expected 2-3 segments, got ${slug.length}`,
	);
}

/**
 * Generates spec URL, omitting repoSlug when it matches projectSlug.
 *
 * @param projectSlug - The project slug
 * @param repoSlug - The repository slug
 * @param specSlug - The spec slug (e.g., "001-environments")
 * @param query - Optional query parameters
 * @returns The constructed URL path with query string
 */
export function buildSpecUrl(
	projectSlug: string,
	repoSlug: string,
	specSlug: string,
	query?: { chat?: boolean; tab?: "tasks" | "spec" },
): string {
	// Omit repoSlug from URL when it matches projectSlug (cleaner URLs)
	const basePath =
		projectSlug === repoSlug
			? `/specs/${projectSlug}/${encodeURIComponent(specSlug)}`
			: `/specs/${projectSlug}/${repoSlug}/${encodeURIComponent(specSlug)}`;

	const params = new URLSearchParams();
	if (query?.chat) params.set("chat", "1");
	if (query?.tab) params.set("tab", query.tab);

	return params.toString() ? `${basePath}?${params}` : basePath;
}
