import { z } from "zod";

/**
 * DNS-1123 label validation schema for slugs
 * - Must start with a lowercase letter
 * - Can contain lowercase letters, numbers, and hyphens
 * - Must end with a lowercase letter or number
 * - Max 63 characters (DNS label limit)
 */
export const slugSchema = z
  .string()
  .min(1, "Slug cannot be empty")
  .max(63, "Slug must be 63 characters or less")
  .regex(
    /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/,
    "Slug must start with a letter, contain only lowercase letters, numbers, and hyphens, and end with a letter or number",
  );

/**
 * Generate a URL-safe slug from a name
 * Follows DNS-1123 label format for Kubernetes compatibility
 */
export function generateSlug(name: string): string {
  let slug = name
    .toLowerCase()
    .trim()
    // Replace non-alphanumeric characters with hyphens
    .replace(/[^a-z0-9]+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "")
    // Collapse multiple hyphens
    .replace(/-+/g, "-");

  // Ensure slug starts with a letter (prepend 'p-' if it starts with a number)
  if (slug && /^[0-9]/.test(slug)) {
    slug = "p-" + slug;
  }

  // Truncate to 63 characters (DNS label limit)
  if (slug.length > 63) {
    slug = slug.substring(0, 63).replace(/-+$/, "");
  }

  // Handle empty result
  if (!slug) {
    slug = "project";
  }

  return slug;
}

/**
 * Validate a slug against DNS-1123 label format
 * Returns true if valid, false otherwise
 */
export function validateSlug(slug: string): boolean {
  const result = slugSchema.safeParse(slug);
  return result.success;
}

/**
 * Parse and validate a slug, throwing on invalid input
 */
export function parseSlug(slug: string): string {
  return slugSchema.parse(slug);
}
