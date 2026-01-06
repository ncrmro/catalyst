"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchGitHubRepos } from "@/actions/repos.github";
import type { ReposData, GitHubRepo } from "@/mocks/github";

export interface RepoSearchProps {
  onSelect: (repo: GitHubRepo) => void;
  excludeUrls?: string[];
  placeholder?: string;
}

type VCSStatus = "loading" | "connected" | "not_connected" | "not_configured";

export function RepoSearch({
  onSelect,
  excludeUrls = [],
  placeholder = "Search repositories...",
}: RepoSearchProps) {
  const [status, setStatus] = useState<VCSStatus>("loading");
  const [repos, setRepos] = useState<ReposData | null>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Fetch repos on mount
  useEffect(() => {
    async function loadRepos() {
      try {
        const data = await fetchGitHubRepos();

        if (!data.github_integration_enabled) {
          if (data.reason === "no_access_token") {
            setStatus("not_connected");
          } else {
            setStatus("not_configured");
          }
          return;
        }

        setStatus("connected");
        setRepos(data);
      } catch (error) {
        console.error("Failed to fetch repositories:", error);
        setStatus("not_configured");
      }
    }

    loadRepos();
  }, []);

  // Filter and flatten repos
  const filteredRepos = useMemo(() => {
    if (!repos) return [];

    const searchLower = search.toLowerCase();

    // Helper to filter list
    const filterList = (list: GitHubRepo[]) =>
      list.filter(
        (repo) =>
          !excludeUrls.includes(repo.html_url) &&
          (repo.full_name.toLowerCase().includes(searchLower) ||
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
          href="/account"
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
                  {repo.full_name}
                </span>
                {repo.private && (
                  <span className="text-[10px] text-on-surface-variant bg-surface-variant px-1.5 py-0.5 rounded border border-outline/20">
                    Private
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
