import { Suspense } from "react";
import { PullRequestsContent } from "./PullRequestsContent";
import { PullRequestsLoading } from "./PullRequestsLoading";

/**
 * Server component wrapper that handles suspense for pull requests
 */
export function PullRequestsList() {
  return (
    <Suspense fallback={<PullRequestsLoading />}>
      <PullRequestsContent />
    </Suspense>
  );
}
