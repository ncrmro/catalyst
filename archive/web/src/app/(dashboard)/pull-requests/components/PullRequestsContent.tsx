import { fetchUserPullRequestsWithTokenStatus } from "@/actions/pull-requests";
import { PullRequestCard } from "./PullRequestCard";
import { GitHubConnectCard } from "./GitHubConnectCard";

/**
 * Server component that fetches and displays pull requests content
 * This component is wrapped in suspense by the parent
 */
export async function PullRequestsContent() {
  const { pullRequests, hasGitHubToken, authMethod } =
    await fetchUserPullRequestsWithTokenStatus();

  // If user doesn't have GitHub token, show connect card
  if (!hasGitHubToken) {
    return <GitHubConnectCard />;
  }

  if (pullRequests.length === 0) {
    return (
      <div className="bg-surface border border-outline rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-on-surface-variant text-2xl">🔄</span>
        </div>
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          No Pull Requests
        </h3>
        <p className="text-on-surface-variant max-w-md mx-auto">
          You don&apos;t have any open pull requests at the moment. When you
          create pull requests in your repositories, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  // Get auth method display info
  const getAuthInfo = () => {
    switch (authMethod) {
      case "pat":
        return {
          label: "Personal Access Token",
          description: "Using GitHub PAT from environment variable",
          icon: "🔑",
          color: "text-amber-600",
        };
      case "github-app":
        return {
          label: "GitHub App",
          description: "Using GitHub App user access token",
          icon: "🔗",
          color: "text-green-600",
        };
      default:
        return {
          label: "No Authentication",
          description: "No GitHub authentication available",
          icon: "❌",
          color: "text-red-600",
        };
    }
  };

  const authInfo = getAuthInfo();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-on-surface">
          Your Pull Requests ({pullRequests.length})
        </h2>
      </div>

      {/* Authentication method indicator */}
      <div className="bg-surface-variant/50 border border-outline rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">{authInfo.icon}</span>
          <span className={`font-medium ${authInfo.color}`}>
            Auth: {authInfo.label}
          </span>
          <span className="text-on-surface-variant">
            • {authInfo.description}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pullRequests.map((pr) => (
          <PullRequestCard key={pr.id} pr={pr} />
        ))}
      </div>
    </div>
  );
}
