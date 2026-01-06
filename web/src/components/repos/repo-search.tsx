"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Filter repos
  const filteredRepos = useMemo(() => {
    if (!repos)
      return { userRepos: [], orgRepos: {} as Record<string, GitHubRepo[]> };

    const searchLower = search.toLowerCase();
    
    // Helper to filter list
    const filterList = (list: GitHubRepo[]) => 
      list.filter(
        (repo) =>
          !excludeUrls.includes(repo.html_url) &&
          (repo.full_name.toLowerCase().includes(searchLower) ||
           repo.description?.toLowerCase().includes(searchLower))
      );

    const userRepos = filterList(repos.user_repos);

    const orgRepos: Record<string, GitHubRepo[]> = {};
    for (const org of repos.organizations) {
      const filtered = filterList(repos.org_repos[org.login] || []);
      if (filtered.length > 0) {
        orgRepos[org.login] = filtered;
      }
    }

    return { userRepos, orgRepos };
  }, [repos, search, excludeUrls]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (repo: GitHubRepo) => {
    onSelect(repo);
    setIsOpen(false);
    setSearch("");
  };

  if (status === "loading") {
    return (
      <div className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface-variant/30 animate-pulse">
        <div className="h-5 bg-surface-variant/50 rounded w-32" />
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
    <div ref={dropdownRef} className="relative">
      <div
        className={cn(
          "w-full px-3 py-2 border rounded-lg bg-surface text-on-surface cursor-pointer flex items-center justify-between transition-all",
          isOpen
            ? "border-primary ring-2 ring-primary/20"
            : "border-outline/50 hover:border-outline"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="bg-transparent border-none focus:outline-none w-full placeholder:text-on-surface-variant/50"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
        />
        <svg
          className={cn(
            "w-4 h-4 text-on-surface-variant transition-transform shrink-0 ml-2",
            isOpen && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-outline/50 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {/* User Repos */}
          {filteredRepos.userRepos.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-variant/30 sticky top-0">
                Your Repositories
              </div>
              {filteredRepos.userRepos.map((repo) => (
                <RepoItem key={repo.id} repo={repo} onSelect={handleSelect} />
              ))}
            </div>
          )}

          {/* Org Repos */}
          {Object.entries(filteredRepos.orgRepos).map(([orgLogin, repos]) => (
            <div key={orgLogin}>
              <div className="px-4 py-1.5 text-xs font-medium text-on-surface-variant bg-surface-variant/30 sticky top-0">
                {orgLogin}
              </div>
              {repos.map((repo) => (
                <RepoItem key={repo.id} repo={repo} onSelect={handleSelect} />
              ))}
            </div>
          ))}

          {/* No results */}
          {filteredRepos.userRepos.length === 0 &&
            Object.keys(filteredRepos.orgRepos).length === 0 && (
              <div className="px-4 py-3 text-sm text-on-surface-variant text-center">
                No repositories found matching &quot;{search}&quot;
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function RepoItem({
  repo,
  onSelect,
}: {
  repo: GitHubRepo;
  onSelect: (repo: GitHubRepo) => void;
}) {
  return (
    <button
      type="button"
      className="w-full px-4 py-2 text-left text-sm hover:bg-primary/10 transition-colors border-b border-outline/10 last:border-0"
      onClick={() => onSelect(repo)}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-on-surface">{repo.full_name}</span>
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
    </button>
  );
}
