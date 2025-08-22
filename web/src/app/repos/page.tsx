import { fetchGitHubRepos } from '@/actions/repos.github';
import Image from 'next/image';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard-layout";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "GitHub Repositories - Catalyst",
  description: "View and manage your GitHub repositories and organization repos.",
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
}

interface GitHubOrganization {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Image 
              src={repo.owner.avatar_url} 
              alt={`${repo.owner.login} avatar`}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full"
            />
            <a 
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary font-semibold text-lg"
            >
              {repo.full_name}
            </a>
            {repo.private && (
              <span className="bg-secondary-container text-on-secondary-container text-xs px-2 py-1 rounded-full">
                Private
              </span>
            )}
          </div>
          
          {repo.description && (
            <p className="text-on-surface-variant mb-3">{repo.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-on-surface-variant">
            {repo.language && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-primary rounded-full"></span>
                {repo.language}
              </span>
            )}
            <span>⭐ {repo.stargazers_count}</span>
            <span>🍴 {repo.forks_count}</span>
            <span>📋 {repo.open_issues_count} issues</span>
            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="ml-4">
          <Link 
            href={`/repos/${repo.id}/connect`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Connect
          </Link>
        </div>
      </div>
    </div>
  );
}

function OrganizationSection({ 
  organization, 
  repos 
}: { 
  organization: GitHubOrganization;
  repos: GitHubRepo[];
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
          <RepoCard key={repo.id} repo={repo} />
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

  let reposData;
  let error: string | null = null;

  try {
    reposData = await fetchGitHubRepos();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch repositories';
    reposData = null;
  }

  if (error) {
    return (
      <DashboardLayout user={session.user}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-on-background mb-2">GitHub Repositories</h1>
            <p className="text-on-surface-variant">
              View and manage your GitHub repositories and organization repos.
            </p>
          </div>
          
          <div className="bg-error-container border border-outline rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-on-error-container mb-2 text-center">Error Loading Repositories</h2>
            <p className="text-on-error-container text-center">{error}</p>
            <div className="mt-4 text-sm text-on-error-container text-center">
              <p>To view repositories, set MOCKED=1 or GITHUB_REPOS_MODE=mocked in your environment.</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!reposData) {
    return (
      <DashboardLayout user={session.user}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-on-background mb-2">GitHub Repositories</h1>
            <p className="text-on-surface-variant">
              View and manage your GitHub repositories and organization repos.
            </p>
          </div>
          
          <div className="bg-surface border border-outline rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-on-surface-variant">Loading repositories...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalRepos = reposData.user_repos.length + 
    Object.values(reposData.org_repos).reduce((sum, repos) => sum + repos.length, 0);

  return (
    <DashboardLayout user={session.user}>
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-on-background mb-2">GitHub Repositories</h1>
          <p className="text-on-surface-variant">
            Connected repositories from your account and organizations
          </p>
          <p className="text-sm text-on-surface-variant mt-2">
            {totalRepos} repositories across {reposData.organizations.length + 1} accounts
          </p>
        </div>

        {/* User Repositories */}
        {reposData.user_repos.length > 0 && (
          <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-on-surface mb-6">Your Repositories</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reposData.user_repos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          </div>
        )}

        {/* Organization Repositories */}
        {reposData.organizations.length > 0 && (
          <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-on-surface mb-6">Organization Repositories</h2>
            <div className="space-y-8">
              {reposData.organizations.map((org) => {
                const orgRepos = reposData.org_repos[org.login] || [];
                if (orgRepos.length === 0) return null;
                
                return (
                  <OrganizationSection 
                    key={org.id} 
                    organization={org} 
                    repos={orgRepos} 
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalRepos === 0 && (
          <div className="bg-surface border border-outline rounded-lg p-8 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-3xl">📁</span>
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-2">No repositories found</h3>
            <p className="text-on-surface-variant max-w-md mx-auto">
              Connect your GitHub account and grant access to organizations to see repositories here.
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
        )}
      </div>
    </DashboardLayout>
  );
}