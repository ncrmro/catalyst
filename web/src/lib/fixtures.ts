/**
 * Fixtures module - centralized test data
 * 
 * This module provides JSON fixtures for database seeding and testing.
 * All fixtures are validated against Zod schemas generated from the Drizzle schema.
 */

import { z } from "zod";

// ============================================================================
// Zod Schemas (manual creation since drizzle-zod isn't available)
// These schemas match the database schema from src/db/schema.ts
// ============================================================================

export const repoFixtureSchema = z.object({
  githubId: z.number(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable().optional(),
  url: z.string(),
  isPrivate: z.boolean(),
  language: z.string().nullable().optional(),
  ownerLogin: z.string(),
  ownerType: z.string(),
  ownerAvatarUrl: z.string().nullable().optional(),
});

export const projectFixtureSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable().optional(),
  ownerLogin: z.string(),
  ownerType: z.string(),
  ownerAvatarUrl: z.string().nullable().optional(),
});

export const userFixtureSchema = z.object({
  email: z.string().email(),
  name: z.string().nullable().optional(),
  admin: z.boolean(),
  image: z.string().nullable().optional(),
});

// ============================================================================
// Typed exports (must be before fixtures to use in type assertions)
// ============================================================================

export type RepoFixture = z.infer<typeof repoFixtureSchema>;
export type ProjectFixture = z.infer<typeof projectFixtureSchema>;
export type UserFixture = z.infer<typeof userFixtureSchema>;

// ============================================================================
// Fixtures Data
// ============================================================================

// Import fixtures from JSON files
import reposJson from "./repos-fixtures.json";
import projectsJson from "./projects-fixtures.json";
import usersJson from "./users-fixtures.json";

/**
 * Repository fixtures
 * Based on createCatalystAndMezeProjects function in src/lib/seed.ts
 */
export const reposFixtures = reposJson as unknown as readonly RepoFixture[];

/**
 * Project fixtures
 * Based on createCatalystAndMezeProjects function in src/lib/seed.ts
 */
export const projectsFixtures = projectsJson as unknown as readonly ProjectFixture[];

/**
 * User fixtures
 * Based on seedDefaultUsers function in src/lib/seed.ts
 */
export const usersFixtures = usersJson as unknown as readonly UserFixture[];

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate fixtures against their schemas
 * This ensures fixtures match the database schema
 */
export function validateFixtures() {
  const results = {
    repos: z.array(repoFixtureSchema).safeParse(reposFixtures),
    projects: z.array(projectFixtureSchema).safeParse(projectsFixtures),
    users: z.array(userFixtureSchema).safeParse(usersFixtures),
  };

  const errors: string[] = [];
  
  for (const [name, result] of Object.entries(results)) {
    if (!result.success) {
      errors.push(`${name}: ${JSON.stringify(result.error.errors, null, 2)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Fixture validation failed:\n${errors.join("\n")}`);
  }

  return true;
}

// Validate on import to catch issues early
validateFixtures();
