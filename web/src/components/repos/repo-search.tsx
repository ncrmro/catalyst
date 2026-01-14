"use client";

import { fetchGitHubRepos } from "@/actions/repos.github";
import { useCachedResource } from "@/lib/use-cached-resource";
import {
  reposDataSchema,
  reposDataWithReasonSchema,
  type GitHubRepo,
} from "@/schemas/github-mock";
import { z } from "zod";
import {
  RepoSearch as RepoSearchComponent,
  type ReposData,
  type RepositoryWithConnections,
} from "@catalyst/react-vcs-components/RepoSearch";

export interface RepoSearchProps {
  onSelect: (repo: GitHubRepo) => void;
  excludeUrls?: string[];
  placeholder?: string;
}

// Re-export the GitHubRepo type for backward compatibility
export type { GitHubRepo };

const reposSchema = z.union([reposDataSchema, reposDataWithReasonSchema]);

/**
 * Convert GitHub-specific repo data to VCS-agnostic format
 */
function convertGitHubRepoToRepository(repo: GitHubRepo): RepositoryWithConnections {
  return {
    id: repo.id.toString(),
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    private: repo.private,
    defaultBranch: "main", // Not available in current schema
    htmlUrl: repo.html_url,
    description: repo.description ?? undefined,
    language: repo.language ?? undefined,
    updatedAt: new Date(repo.updated_at),
    connections: repo.connections,
  };
}

/**
 * RepoSearch wrapper component that fetches data and passes it to the base component
 * This maintains backward compatibility with the existing API while using the new package
 * Adapts GitHub-specific data to VCS-agnostic format
 */
export function RepoSearch({
  onSelect,
  excludeUrls = [],
  placeholder = "Search repositories...",
}: RepoSearchProps) {
  const { data: repos, isLoading } = useCachedResource({
    key: "catalyst_github_repos",
    fetcher: fetchGitHubRepos,
    schema: reposSchema,
  });

  // Convert GitHub data to VCS-agnostic format
  const vcsRepos: ReposData | null = repos ? {
    user_repos: repos.user_repos.map(convertGitHubRepoToRepository),
    organizations: repos.organizations.map(org => ({
      id: org.id.toString(),
      login: org.login,
      name: org.login,
      description: org.description ?? undefined,
      avatarUrl: org.avatar_url,
      url: `https://github.com/${org.login}`,
      type: "Organization" as const,
    })),
    org_repos: Object.fromEntries(
      Object.entries(repos.org_repos).map(([org, orgRepos]) => [
        org,
        orgRepos.map(convertGitHubRepoToRepository),
      ])
    ),
    vcs_integration_enabled: repos.github_integration_enabled,
    reason: 'reason' in repos ? repos.reason : undefined,
  } : null;

  // Convert VCS-agnostic repo back to GitHub format for callback
  const handleSelect = (repo: RepositoryWithConnections) => {
    // Find the original GitHub repo to preserve all fields
    const originalRepo = repos?.user_repos.find(r => r.id.toString() === repo.id) ||
      Object.values(repos?.org_repos ?? {}).flat().find(r => r.id.toString() === repo.id);
    
    if (originalRepo) {
      onSelect(originalRepo);
    }
  };

  return (
    <RepoSearchComponent
      onSelect={handleSelect}
      repos={vcsRepos}
      isLoading={isLoading}
      excludeUrls={excludeUrls}
      placeholder={placeholder}
      accountSettingsUrl="/account"
    />
  );
}
