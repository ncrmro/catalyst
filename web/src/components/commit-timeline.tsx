import { CommitWithRepo } from "@/actions/commits";
import { CommitCard } from "./commit-card";

interface CommitTimelineProps {
  commits: CommitWithRepo[];
  loading?: boolean;
}

export function CommitTimeline({ commits, loading }: CommitTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border border-outline/50 rounded-lg p-4 bg-surface animate-pulse"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-variant" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-surface-variant rounded w-3/4" />
                <div className="h-4 bg-surface-variant rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="text-center py-12 bg-surface border border-outline/50 rounded-lg">
        <svg
          className="w-16 h-16 mx-auto text-on-surface-variant/50 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-on-surface mb-2">
          No commits found
        </h3>
        <p className="text-on-surface-variant max-w-md mx-auto">
          No commits match your current filters. Try adjusting your filters or
          check back later for new activity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {commits.map((commit) => (
        <CommitCard key={commit.sha} commit={commit} />
      ))}
    </div>
  );
}
