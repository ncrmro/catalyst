/**
 * Namespace Utilities
 *
 * Implements namespace generation logic with 63-character limit handling
 * as specified in FR-ENV-020 and FR-ENV-021.
 *
 * Kubernetes namespace names must:
 * - Be at most 63 characters (DNS-1123 label limit)
 * - Contain only lowercase letters, numbers, and hyphens
 * - Start and end with alphanumeric characters
 */

import crypto from "crypto";

/**
 * Sanitize a string for use as a Kubernetes namespace component.
 * Does NOT enforce length limits - use generateNamespaceWithHash for that.
 *
 * @param name - Input string to sanitize
 * @returns DNS-1123 compliant string (lowercase, alphanumeric + hyphens)
 */
export function sanitizeNamespaceComponent(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-") // Replace invalid chars with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a namespace name with automatic truncation and hashing if needed.
 *
 * Implementation of FR-ENV-021:
 * If the combined length exceeds 63 characters:
 * 1. Calculate SHA-256 hash of the full string
 * 2. Truncate the full string to 57 characters
 * 3. Append a hyphen and the first 5 characters of the hash
 * 4. Total length: 57 + 1 + 5 = 63 characters
 *
 * @param components - Array of namespace components (e.g., ["team", "project", "env"])
 * @returns DNS-1123 compliant namespace name, at most 63 characters
 *
 * @example
 * generateNamespaceWithHash(["my-team", "my-project", "feature"])
 * // => "my-team-my-project-feature" (29 chars, under limit)
 *
 * @example
 * generateNamespaceWithHash(["my-super-long-team", "my-super-long-project", "feature-branch"])
 * // => "my-super-long-team-my-super-long-project-feature-bra-a1b2c" (63 chars)
 */
export function generateNamespaceWithHash(components: string[]): string {
  // Sanitize each component
  const sanitized = components.map(sanitizeNamespaceComponent).filter(Boolean);

  // Join with hyphens
  const fullName = sanitized.join("-");

  // If under 63 characters, return as-is
  if (fullName.length <= 63) {
    return fullName;
  }

  // Calculate SHA-256 hash of the full name
  const hash = crypto.createHash("sha256").update(fullName).digest("hex");

  // Take first 5 characters of hash
  const hashSuffix = hash.slice(0, 5);

  // Truncate to 57 characters (63 - 1 hyphen - 5 hash chars)
  const truncated = fullName.slice(0, 57);

  // Remove trailing hyphen if present after truncation
  const cleanTruncated = truncated.replace(/-+$/, "");

  // Combine truncated name with hash
  return `${cleanTruncated}-${hashSuffix}`;
}

/**
 * Generate team namespace name.
 *
 * Team namespace contains Project CRs and shared team infrastructure.
 *
 * @param teamName - Team name (will be sanitized)
 * @returns Team namespace name (format: `<team-name>`)
 */
export function generateTeamNamespace(teamName: string): string {
  return sanitizeNamespaceComponent(teamName);
}

/**
 * Generate project namespace name.
 *
 * Project namespace contains Environment CRs and provides project-level isolation.
 *
 * @param teamName - Team name (will be sanitized)
 * @param projectName - Project name (will be sanitized)
 * @returns Project namespace name (format: `<team-name>-<project-name>`)
 */
export function generateProjectNamespace(
  teamName: string,
  projectName: string,
): string {
  return generateNamespaceWithHash([teamName, projectName]);
}

/**
 * Generate environment namespace name.
 *
 * Environment namespace is the actual target for workload deployments.
 * This is where Pods, Services, Deployments, etc. are created.
 *
 * @param teamName - Team name (will be sanitized)
 * @param projectName - Project name (will be sanitized)
 * @param environmentName - Environment name (will be sanitized)
 * @returns Environment namespace name (format: `<team>-<project>-<env>`)
 */
export function generateEnvironmentNamespace(
  teamName: string,
  projectName: string,
  environmentName: string,
): string {
  return generateNamespaceWithHash([teamName, projectName, environmentName]);
}

/**
 * Validate that a namespace name is DNS-1123 compliant and under 63 characters.
 *
 * @param name - Namespace name to validate
 * @returns True if valid, false otherwise
 */
export function isValidNamespaceName(name: string): boolean {
  if (name.length === 0 || name.length > 63) {
    return false;
  }

  // Must match DNS-1123 label format
  const dns1123Regex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
  return dns1123Regex.test(name);
}

/**
 * Extract namespace hierarchy components from labels.
 *
 * @param labels - Kubernetes resource labels
 * @returns Namespace hierarchy info or null if labels incomplete
 */
export function extractNamespaceHierarchy(
  labels: Record<string, string> | undefined,
): { team: string; project: string; environment: string } | null {
  if (!labels) return null;

  const team = labels["catalyst.dev/team"];
  const project = labels["catalyst.dev/project"];
  const environment = labels["catalyst.dev/environment"];

  if (!team || !project || !environment) {
    return null;
  }

  return { team, project, environment };
}
