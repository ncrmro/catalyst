/**
 * Project Types
 *
 * Shared type definitions that can be safely imported by client components.
 * This file MUST NOT import from "@/db" or "@/models/*" to avoid bundling pg.
 *
 * With Storybook mocks in place for drizzle-orm and @/db/schema, we can now
 * use type-only imports to infer types from the schema without bundling Node.js dependencies.
 */

import type { InferSelectModel } from "drizzle-orm";
import type {
  projects,
  projectsRepos,
  projectEnvironments,
  repos,
  teams,
} from "@/db/schema";

// Base types derived from schema (auto-sync with migrations)
export type Project = InferSelectModel<typeof projects>;
export type Repo = InferSelectModel<typeof repos>;
export type Team = InferSelectModel<typeof teams>;
export type ProjectRepoRow = InferSelectModel<typeof projectsRepos>;
export type ProjectEnvironment = InferSelectModel<typeof projectEnvironments>;

// Client-friendly interface for repository info
export interface ProjectRepo {
  id: string;
  name: string;
  full_name: string;
  url: string;
  primary: boolean;
}

// Repository connection with nested repo data
export interface ProjectRepoWithRepo extends ProjectRepoRow {
  repo: Repo;
}

// Full project with all relations (matches getProjects() return type)
export interface ProjectWithRelations extends Project {
  repositories: ProjectRepoWithRepo[];
  environments: ProjectEnvironment[];
  team?: Team;
  repo?: Repo;
}
