"use client";

import { Card } from "@/components/ui/card";

export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    type: "User" | "Organization";
    avatar_url: string;
  };
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  connection: { projectId: string; isPrimary: boolean } | null;
  teamId: string;
  database_id: string;
}

interface RepoCardProps {
  repo: Repo;
}

export function RepoCard({ repo }: RepoCardProps) {
  return (
    <Card>
      <div className="flex justify-between items-start mb-4">
        <h3
          className="text-xl font-semibold text-on-surface truncate pr-2"
          title={repo.name}
        >
          {repo.name}
        </h3>
        <span
          className={`text-xs px-2 py-1 rounded ${repo.private ? "bg-secondary-container text-on-secondary-container" : "bg-primary-container text-on-primary-container"}`}
        >
          {repo.private ? "Private" : "Public"}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-on-surface-variant line-clamp-2 min-h-[2.5em]">
          {repo.description || "No description available"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-on-surface-variant">Language</p>
          <p className="text-sm font-medium text-on-surface">
            {repo.language || "N/A"}
          </p>
        </div>

        <div>
          <p className="text-sm text-on-surface-variant">Updated</p>
          <p className="text-sm font-medium text-on-surface">
            {new Date(repo.updated_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {repo.connection && (
        <div className="mb-4 p-3 bg-primary-container/50 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-on-surface">
                Connected to Project
              </p>
              <p className="text-xs text-on-surface-variant">
                {repo.connection.projectId}
                {repo.connection.isPrimary && (
                  <span className="ml-2 font-bold">(Primary)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-outline text-on-surface text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-surface-variant transition-colors"
        >
          View on GitHub
        </a>
      </div>
    </Card>
  );
}
