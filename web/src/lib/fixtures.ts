/**
 * Fixtures module - centralized test data
 * 
 * This module provides JSON fixtures for database seeding and testing.
 * All fixtures are validated against Zod schemas generated from the Drizzle schema.
 */

import { z, createInsertSchema } from "@tetrastack/backend/utils";
import { repos, projects, users } from "@/db/schema";

// ============================================================================
// Zod Schemas (generated from Drizzle schema using drizzle-zod)
// ============================================================================

// Generate insert schemas from Drizzle tables
const repoInsertSchema = createInsertSchema(repos);
const projectInsertSchema = createInsertSchema(projects);
const userInsertSchema = createInsertSchema(users);

// Create fixture schemas - these are subsets of the insert schemas
// excluding auto-generated fields and teamId which is added during seeding
export const repoFixtureSchema = repoInsertSchema.pick({
  githubId: true,
  name: true,
  fullName: true,
  description: true,
  url: true,
  isPrivate: true,
  language: true,
  ownerLogin: true,
  ownerType: true,
  ownerAvatarUrl: true,
});

export const projectFixtureSchema = projectInsertSchema.pick({
  name: true,
  fullName: true,
  description: true,
  ownerLogin: true,
  ownerType: true,
  ownerAvatarUrl: true,
});

export const userFixtureSchema = userInsertSchema.pick({
  email: true,
  name: true,
  admin: true,
  image: true,
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
