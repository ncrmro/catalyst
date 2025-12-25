/**
 * Project Types
 *
 * Shared type definitions that can be safely imported by client components.
 * This file MUST NOT import from "@/db" or "@/models/*" to avoid bundling pg.
 *
 * These types are manually defined to match the database schema without importing
 * drizzle-orm, which allows them to be used in Storybook stories and client components
 * without requiring database/Node.js dependencies.
 */

// Base types manually defined to match schema (keep in sync with src/db/schema.ts)
export interface Project {
  id: string;
  name: string;
  slug: string;
  fullName: string;
  description: string | null;
  ownerLogin: string;
  ownerType: string;
  ownerAvatarUrl: string | null;
  teamId: string;
  previewEnvironmentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Repo {
  id: string;
  githubId: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  ownerLogin: string;
  ownerType: string;
  ownerAvatarUrl: string | null;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
  pushedAt: Date | null;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectRepoRow {
  projectId: string;
  repoId: string;
  isPrimary: boolean;
  createdAt: Date;
}

export interface ProjectEnvironment {
  id: string;
  projectId: string;
  repoId: string;
  environment: string;
  latestDeployment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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
