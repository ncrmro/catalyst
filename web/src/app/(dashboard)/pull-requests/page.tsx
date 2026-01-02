import { Suspense } from "react";
import { PullRequestsList } from "./components/PullRequestsList";
import { PullRequestsLoading } from "./components/PullRequestsLoading";

/**
 * Pull Requests page - shows user's pull requests from multiple git providers
 * Uses suspense for fast loading
 */
export default function PullRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-on-background mb-2">
          Pull Requests
        </h1>
        <p className="text-on-surface-variant">
          View and manage your pull requests across all connected repositories.
        </p>
      </div>

      <Suspense fallback={<PullRequestsLoading />}>
        <PullRequestsList />
      </Suspense>
    </div>
  );
}
