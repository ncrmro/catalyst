"use client";

import { useState, useMemo } from "react";
import type { Repository } from "@catalyst/vcs-provider";

/**
 * Types for the RepoSearch component
 * Uses VCS-agnostic types to support multiple providers (GitHub, GitLab, etc.)
 */

/**
 * VCS Organization/Group representation
 */
export interface VCSOrganization {
  id: string;
  login: string;
  name?: string;
  description?: string;
  avatarUrl: string;
  url: string;
  type: "Organization";
}

/**
 * Repository connection metadata
 * Links a repository to a project in the platform
 */
export interface RepositoryConnection {
  projectId: string;
  projectName?: string;
  isPrimary: boolean;
}

/**
 * Extended repository type with connection metadata
 */
export interface RepositoryWithConnections extends Repository {
  connections?: RepositoryConnection[];
}

/**
 * Repository data structure for the picker
 * Organizes repositories by user and organization
 */
export interface ReposData {
  user_repos: RepositoryWithConnections[];
  organizations: VCSOrganization[];
  org_repos: Record<string, RepositoryWithConnections[]>;
  vcs_integration_enabled: boolean;
  reason?: "no_access_token" | "token_expired" | "permission_denied" | "error";
}

export interface RepoSearchProps {
  /**
   * Callback function called when a repository is selected
   */
  onSelect: (repo: RepositoryWithConnections) => void;
  
  /**
   * Repository data to display
   * Can be null if still loading or unavailable
   */
  repos: ReposData | null;
  
  /**
   * Whether the data is currently loading
   */
  isLoading?: boolean;
  
  /**
   * List of repository URLs to exclude from the search results
   */
  excludeUrls?: string[];
  
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;
  
  /**
   * Link to account settings page for connecting VCS provider
   */
  accountSettingsUrl?: string;
}

type VCSStatus = "loading" | "connected" | "not_connected" | "not_configured";

/**
 * RepoSearch - A searchable repository picker component
 * 
 * Features:
 * - Search and filter repositories by name and description
 * - Shows user and organization repositories
 * - Displays repository metadata (private/public, connections)
 * - Handles various VCS connection states
 * - VCS-agnostic: works with GitHub, GitLab, and other providers
 */
export function RepoSearch({
  onSelect,
  repos,
  isLoading = false,
  excludeUrls = [],
  placeholder = "Search repositories...",
  accountSettingsUrl = "/account",
}: RepoSearchProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Derive status from data
  const status: VCSStatus = useMemo(() => {
    if (!repos) {
      return isLoading ? "loading" : "not_configured";
    }

    if (repos.vcs_integration_enabled) {
      return "connected";
    }

    // Handle reasons when integration is disabled
    if (repos.reason) {
      if (repos.reason === "no_access_token") {
        return "not_connected";
      }
      // "token_expired", "permission_denied", "error" -> treat as not configured/error state
      return "not_configured";
    }

    // Fallback if we have data but integration is disabled (e.g. using DB repos only)
    return "connected"; // Treat as connected if we have data to show (even if just DB repos)
  }, [repos, isLoading]);

  // Filter and flatten repos
  const filteredRepos = useMemo(() => {
    if (!repos) return [];

    const searchLower = search.toLowerCase();

    // Helper to filter list
    const filterList = (list: RepositoryWithConnections[]) =>
      list.filter(
        (repo) =>
          !excludeUrls.includes(repo.htmlUrl) &&
          (repo.fullName.toLowerCase().includes(searchLower) ||
            repo.description?.toLowerCase().includes(searchLower)),
      );

    const userRepos = filterList(repos.user_repos);
    const orgRepos = Object.values(repos.org_repos).flatMap((list) =>
      filterList(list),
    );

    // Combine and sort (user repos first, then alphabetically? or just as is)
    // Let's keep user repos first as they are likely more relevant
    return [...userRepos, ...orgRepos];
  }, [repos, search, excludeUrls]);

  const displayRepos = showAll ? filteredRepos : filteredRepos.slice(0, 3);
  const hasMore = filteredRepos.length > 3;

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface-variant/30 animate-pulse">
          <div className="h-5 bg-surface-variant/50 rounded w-32" />
        </div>
      </div>
    );
  }

  if (status === "not_configured") {
    return (
      <div className="p-3 bg-surface-variant/30 border border-outline/30 rounded-lg text-sm text-on-surface-variant">
        VCS integration not configured
      </div>
    );
  }

  if (status === "not_connected") {
    return (
      <div className="p-3 bg-primary-container/30 border border-primary/30 rounded-lg">
        <p className="text-sm text-on-surface">
          Connect your account to select repositories
        </p>
        <a
          href={accountSettingsUrl}
          className="text-xs text-primary hover:underline mt-1 inline-block"
        >
          Go to Account settings →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          data-testid="repo-search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowAll(false); // Reset expansion on search
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Results List */}
      <div className="space-y-1">
        {displayRepos.map((repo) => (
          <div
            key={repo.id}
            className="flex items-center justify-between p-3 rounded-lg border border-outline/30 hover:bg-surface-variant/30 transition-colors group"
          >
            <div className="min-w-0 flex-1 mr-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-on-surface truncate">
                  {repo.fullName}
                </span>
                {repo.private && (
                  <span className="text-[10px] text-on-surface-variant bg-surface-variant px-1.5 py-0.5 rounded border border-outline/20">
                    Private
                  </span>
                )}
                {repo.connections && repo.connections.length > 0 && (
                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    Linked to{" "}
                    {repo.connections
                      .map((c) => c.projectName || c.projectId)
                      .join(", ")}
                  </span>
                )}
              </div>
              {repo.description && (
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                  {repo.description}
                </p>
              )}
            </div>
            <button
              onClick={() => onSelect(repo)}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-on-primary rounded-md hover:opacity-90 transition-opacity whitespace-nowrap opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              Add
            </button>
          </div>
        ))}

        {filteredRepos.length === 0 && search && (
          <div className="p-4 text-center text-sm text-on-surface-variant">
            No repositories found matching &quot;{search}&quot;
          </div>
        )}

        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-2 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors border border-dashed border-primary/30"
          >
            Show {filteredRepos.length - 3} more repositories
          </button>
        )}
      </div>
    </div>
  );
}
