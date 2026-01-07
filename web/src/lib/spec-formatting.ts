/**
 * Spec Formatting Utilities
 *
 * Helper functions for formatting spec names and identifiers for display
 */

/**
 * Strips the numeric prefix and dash from a spec name for display.
 * Examples:
 *   "001-environments" → "environments"
 *   "003-vcs-providers" → "vcs-providers"
 *   "010-platform" → "platform"
 *
 * @param specName - The full spec name/id (e.g., "001-environments")
 * @returns The formatted name without the numeric prefix
 */
export function formatSpecName(specName: string): string {
  // Match pattern: 3 digits followed by a dash at the start
  const pattern = /^\d{3}-/;
  return specName.replace(pattern, "");
}
