"use client";

import {
  TabbedEntityCard,
  type EntityCardTab,
} from "@/components/ui/entity-card";

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

const REPO_TABS: EntityCardTab[] = [
  { value: "status", label: "Status" },
  { value: "new", label: "New" },
];

interface RepositoryRowProps {
  repo: Repo;
}

function RepositoryRowItem({ repo }: RepositoryRowProps) {
  return (
    <div className="block px-4 py-3 hover:bg-surface/50 transition-colors rounded-lg group">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-medium text-on-surface truncate"
              title={repo.full_name}
            >
              {repo.name}
            </h3>
            {repo.connection?.isPrimary && (
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm bg-primary/10 text-primary border border-primary/20">
                Primary
              </span>
            )}
          </div>
          <div className="text-sm text-on-surface-variant flex gap-2 items-center">
            {repo.language && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                {repo.language}
              </span>
            )}
            <span className="text-on-surface-variant/50">•</span>
            <span>{new Date(repo.updated_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${
              repo.private
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-variant text-on-surface-variant"
            }`}
          >
            {repo.private ? "Private" : "Public"}
          </span>

          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
            title="View on GitHub"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export interface RepositoriesCardProps {
  repositories: Repo[];
  projectSlug?: string;
}

export function RepositoriesCard({ repositories }: RepositoriesCardProps) {
  const tabContent = {
    status: (
      <div className="space-y-1">
        {repositories.length > 0 ? (
          repositories.map((repo) => (
            <RepositoryRowItem key={repo.id} repo={repo} />
          ))
        ) : (
          <div className="py-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <p className="text-on-surface-variant">No repositories connected</p>
            <p className="text-sm text-on-surface-variant/70 mt-1">
              Connect a repository to get started
            </p>
          </div>
        )}
      </div>
    ),
    new: (
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">
          Connect a new GitHub repository to this project.
        </p>
        <button
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity"
          onClick={() => alert("Connect repo flow implementation needed")}
        >
          Connect Repository
        </button>
      </div>
    ),
  };

  return (
    <TabbedEntityCard
      title="Git Repositories"
      subtitle="Connected source code repositories"
      tabs={REPO_TABS}
      tabContent={tabContent}
    />
  );
}
