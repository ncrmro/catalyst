import { fetchGitHubRepos } from '@/actions/repos.github';
import { getRepositoryConnectionStatus } from '@/actions/repos.connected';
import Image from 'next/image';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Git Repositories - Catalyst",
  description: "View and manage your Git repositories across different platforms.",
};

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    type: 'User' | 'Organization';
    avatar_url: string;
  };
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  connection?: {
    projectId: string;
    isPrimary: boolean;
  } | null;
  database_id?: string;
  teamId?: string;
}

interface GitHubOrganization {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
}

interface ReposData {
  user_repos: GitHubRepo[];
  organizations: GitHubOrganization[];
  org_repos: Record<string, GitHubRepo[]>;
  github_integration_enabled: boolean;
}

function RepoCard({ repo, isConnected }: { repo: GitHubRepo; isConnected: boolean }) {
  return (
    <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Image 
              src={repo.owner.avatar_url} 
              alt={`${repo.owner.login} avatar`}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full flex-shrink-0"
            />
            <a 
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary font-semibold text-lg break-words"
            >
              {repo.full_name}
            </a>
            {repo.private && (
              <span className="bg-secondary-container text-on-secondary-container text-xs px-2 py-1 rounded-full flex-shrink-0">
                Private
              </span>
            )}
            {isConnected && (
              <span className="bg-primary-container text-on-primary-container text-xs px-2 py-1 rounded-full flex-shrink-0">
                Connected
              </span>
            )}
          </div>
          
          {repo.description && (
            <p className="text-on-surface-variant mb-3 line-clamp-2">{repo.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-on-surface-variant flex-wrap">
            {repo.language && (
              <span className="flex items-center gap-1 flex-shrink-0">
                <span className="w-3 h-3 bg-primary rounded-full"></span>
                {repo.language}
              </span>
            )}
            <span className="flex-shrink-0">⭐ {repo.stargazers_count}</span>
            <span className="flex-shrink-0">🍴 {repo.forks_count}</span>
            <span className="flex-shrink-0">📋 {repo.open_issues_count} issues</span>
            <span className="flex-shrink-0">Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-2">
          {isConnected ? (
            <Link 
              href={`/projects`}
              className="inline-flex items-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-primary-container hover:text-on-primary-container focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            >
              Manage Project
            </Link>
          ) : (
            <Link 
              href={`/repos/${repo.id}/connect`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-on-primary bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            >
              Connect
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function OrganizationSection({ 
  organization, 
  repos,
  connectionStatus
}: { 
  organization: GitHubOrganization;
  repos: GitHubRepo[];
  connectionStatus: Record<number, boolean>;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Image 
          src={organization.avatar_url} 
          alt={`${organization.login} avatar`}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full"
        />
        <div>
          <h2 className="text-xl font-semibold text-on-surface">{organization.login}</h2>
          {organization.description && (
            <p className="text-on-surface-variant text-sm">{organization.description}</p>
          )}
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {repos.map((repo) => (
          <RepoCard 
            key={repo.id} 
            repo={repo} 
            isConnected={(connectionStatus && connectionStatus[repo.id]) || false}
          />
        ))}
      </div>
    </div>
  );
}

export default async function ReposPage() {
  // Authentication check (matching the dashboard pattern)
  let session;
  if (process.env.MOCKED === '1') {
    session = {
      user: {
        name: "Test User",
        email: "test@example.com"
      },
      userId: "test-user-1",
      accessToken: "mock-token"
    };
  } else {
    session = await auth();
    
    // Redirect to login if not authenticated
    if (!session?.user) {
      redirect("/login");
    }
  }

  let reposData: ReposData | null = null;
  let error: string | null = null;

  try {
    reposData = await fetchGitHubRepos();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch repositories';
    reposData = null;
  }

  // Fetch connection status for all repositories
  let connectionStatus: Record<number, boolean> = {};
  if (reposData) {
    try {
      const allRepos = [
        ...reposData.user_repos,
        ...Object.values(reposData.org_repos).flat()
      ];
      const allRepoIds = allRepos.map(repo => repo.id);
      connectionStatus = await getRepositoryConnectionStatus(allRepoIds);
    } catch (err) {
      console.warn('Failed to fetch repository connection status:', err);
      // Continue with empty connection status (all will show as unconnected)
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-on-background mb-2">Git Repositories</h1>
          <p className="text-on-surface-variant">
            View and manage your Git repositories across different platforms.
          </p>
        </div>
        
        <div className="bg-error-container border border-outline rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-on-error-container mb-2 text-center">Error Loading Repositories</h2>
          <p className="text-on-error-container text-center">{error}</p>
          <div className="mt-4 text-sm text-on-error-container text-center">
            <p>Please check your database connection or try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!reposData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-on-background mb-2">Git Repositories</h1>
          <p className="text-on-surface-variant">
            View and manage your Git repositories across different platforms.
          </p>
        </div>
        
        <div className="bg-surface border border-outline rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading repositories...</p>
        </div>
      </div>
    );
  }

  const totalRepos = reposData.user_repos.length + 
    Object.values(reposData.org_repos).reduce((sum, repos) => sum + repos.length, 0);

  // Separate connected and unconnected repositories
  const allRepos = [
    ...reposData.user_repos,
    ...Object.values(reposData.org_repos).flat()
  ];
  
  const connectedRepos = allRepos.filter(repo => connectionStatus && connectionStatus[repo.id]);
  const availableRepos = allRepos.filter(repo => !connectionStatus || !connectionStatus[repo.id]);
  
  // Separate user repos
  const connectedUserRepos = reposData.user_repos.filter(repo => connectionStatus && connectionStatus[repo.id]);
  const availableUserRepos = reposData.user_repos.filter(repo => !connectionStatus || !connectionStatus[repo.id]);

  return (
    <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-on-background mb-2">Git Repositories</h1>
          <p className="text-on-surface-variant">
            View and manage your Git repositories across different platforms.
          </p>
          <p className="text-sm text-on-surface-variant mt-2">
            {totalRepos} repositories across {reposData.organizations.length + 1} accounts
            {connectedRepos.length > 0 && (
              <span className="text-primary"> • {connectedRepos.length} connected</span>
            )}
          </p>
          
          {/* GitHub Integration Status */}
          {!reposData.github_integration_enabled && (
            <div className="mt-2 p-3 bg-surface-variant/20 border border-outline rounded-md">
              <p className="text-sm flex items-center gap-2">
                <span className="text-amber-500">⚠️</span>
                <span>
                  GitHub integration is not currently enabled. 
                  Only repositories from the database are shown.
                  <Link href="/admin/github" className="ml-2 text-primary hover:underline">
                    Configure GitHub Integration
                  </Link>
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Connected Repositories Section */}
        {connectedRepos.length > 0 && (
          <div className="bg-primary-container/10 border border-primary-container rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-primary text-xl">🔗</span>
              <h2 className="text-2xl font-semibold text-on-surface">Connected Repositories</h2>
              <span className="bg-primary-container text-on-primary-container text-sm px-2 py-1 rounded-full">
                {connectedRepos.length}
              </span>
            </div>
            
            {/* Connected User Repositories */}
            {connectedUserRepos.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-on-surface mb-4">Your Repositories</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connectedUserRepos.map((repo) => (
                    <RepoCard 
                      key={repo.id} 
                      repo={repo} 
                      isConnected={true}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Connected Organization Repositories */}
            {reposData.organizations.map((org) => {
              const orgRepos = (reposData.org_repos[org.login] || []).filter(repo => connectionStatus && connectionStatus[repo.id]);
              if (orgRepos.length === 0) return null;
              
              return (
                <div key={org.id} className="mb-8">
                  <OrganizationSection 
                    organization={org} 
                    repos={orgRepos}
                    connectionStatus={connectionStatus || {}}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Available Repositories Section */}
        {availableRepos.length > 0 && (
          <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-on-surface-variant text-xl">📦</span>
              <h2 className="text-2xl font-semibold text-on-surface">Available Repositories</h2>
              <span className="bg-surface-variant text-on-surface-variant text-sm px-2 py-1 rounded-full">
                {availableRepos.length}
              </span>
            </div>
            
            {/* Available User Repositories */}
            {availableUserRepos.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-on-surface mb-4">Your Repositories</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availableUserRepos.map((repo) => (
                    <RepoCard 
                      key={repo.id} 
                      repo={repo} 
                      isConnected={false}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Available Organization Repositories */}
            {reposData.organizations.map((org) => {
              const orgRepos = (reposData.org_repos[org.login] || []).filter(repo => !connectionStatus[repo.id]);
              if (orgRepos.length === 0) return null;
              
              return (
                <div key={org.id} className="mb-8">
                  <OrganizationSection 
                    organization={org} 
                    repos={orgRepos}
                    connectionStatus={connectionStatus}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {totalRepos === 0 && (
          <div className="bg-surface border border-outline rounded-lg p-8 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-3xl">📁</span>
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-2">No repositories found</h3>
            
            {reposData.github_integration_enabled ? (
              <div>
                <p className="text-on-surface-variant max-w-md mx-auto">
                  Connect your GitHub account and grant access to organizations to see your repositories here.
                </p>
                <div className="mt-6">
                  <a
                    href="/github"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Set up GitHub Integration
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-on-surface-variant max-w-md mx-auto">
                  No repositories found in the database. Enable GitHub integration to discover and import repositories.
                </p>
                <div className="mt-6">
                  <a
                    href="/admin/github"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Configure GitHub Integration
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }