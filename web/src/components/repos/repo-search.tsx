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
} from "@catalyst/react-vcs-components/RepoSearch";

export interface RepoSearchProps {
  onSelect: (repo: GitHubRepo) => void;
  excludeUrls?: string[];
  placeholder?: string;
}

const reposSchema = z.union([reposDataSchema, reposDataWithReasonSchema]);

/**
 * RepoSearch wrapper component that fetches data and passes it to the base component
 * This maintains backward compatibility with the existing API while using the new package
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

  return (
    <RepoSearchComponent
      onSelect={onSelect}
      repos={repos as ReposData | null}
      isLoading={isLoading}
      excludeUrls={excludeUrls}
      placeholder={placeholder}
      accountSettingsUrl="/account"
    />
  );
}
