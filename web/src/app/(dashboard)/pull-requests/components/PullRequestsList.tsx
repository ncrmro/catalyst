import { fetchUserPullRequests } from '@/actions/pull-requests';
import { PullRequestCard } from './PullRequestCard';

/**
 * Server component that fetches and displays pull requests
 */
export async function PullRequestsList() {
  const pullRequests = await fetchUserPullRequests();

  if (pullRequests.length === 0) {
    return (
      <div className="bg-surface border border-outline rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-on-surface-variant text-2xl">🔄</span>
        </div>
        <h3 className="text-lg font-semibold text-on-surface mb-2">No Pull Requests</h3>
        <p className="text-on-surface-variant max-w-md mx-auto">
          You don&apos;t have any open pull requests at the moment. When you create pull requests in your repositories, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-on-surface">
          Your Pull Requests ({pullRequests.length})
        </h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pullRequests.map((pr) => (
          <PullRequestCard key={pr.id} pr={pr} />
        ))}
      </div>
    </div>
  );
}