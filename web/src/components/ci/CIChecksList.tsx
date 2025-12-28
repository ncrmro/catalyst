import type { CICheck } from "@/lib/types/ci-checks";
import { CIStatusBadge } from "./CIStatusBadge";

interface CIChecksListProps {
  checks: CICheck[];
}

export function CIChecksList({ checks }: CIChecksListProps) {
  if (checks.length === 0) {
    return (
      <div className="text-center py-8">
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-on-surface-variant">No CI checks found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checks.map((check) => (
        <div
          key={check.id}
          className="flex items-start justify-between gap-4 p-4 rounded-lg bg-surface-variant/30 hover:bg-surface-variant/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <CIStatusBadge state={check.state} />
              <span className="text-xs text-on-surface-variant uppercase tracking-wide">
                {check.source}
              </span>
            </div>
            <h4 className="text-sm font-medium text-on-surface mb-1">
              {check.name}
            </h4>
            {check.description && (
              <p className="text-sm text-on-surface-variant">
                {check.description}
              </p>
            )}
            {check.duration && (
              <p className="text-xs text-on-surface-variant mt-1">
                Duration: {formatDuration(check.duration)}
              </p>
            )}
          </div>
          {check.url && (
            <a
              href={check.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2 hover:bg-surface-variant rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-on-surface-variant"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
