# CI Components - Ready to Deploy

These components implement T029-T030 for displaying CI check status.

## Required Directory

```bash
mkdir -p web/src/components/ci
```

## Files Ready for Deployment

### 1. `/web/src/components/ci/CIStatusBadge.tsx` (T029)

```typescript
/**
 * CI Status Badge Component
 * Part of spec 009-projects - US3: View CI Check Status
 * T029: CIStatusBadge component
 */

import type { CheckState } from "@/types/ci-checks";

interface CIStatusBadgeProps {
  state: CheckState;
  count?: number;
  size?: "sm" | "md" | "lg";
}

const stateConfig: Record<
  CheckState,
  {
    label: string;
    icon: JSX.Element;
    bgColor: string;
    textColor: string;
  }
> = {
  passing: {
    label: "Passing",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    bgColor: "bg-green-500/20",
    textColor: "text-green-400",
  },
  failing: {
    label: "Failing",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
    bgColor: "bg-red-500/20",
    textColor: "text-red-400",
  },
  pending: {
    label: "Pending",
    icon: (
      <svg
        className="w-4 h-4 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    ),
    bgColor: "bg-yellow-500/20",
    textColor: "text-yellow-400",
  },
  cancelled: {
    label: "Cancelled",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
          clipRule="evenodd"
        />
      </svg>
    ),
    bgColor: "bg-gray-500/20",
    textColor: "text-gray-400",
  },
  skipped: {
    label: "Skipped",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
          clipRule="evenodd"
        />
      </svg>
    ),
    bgColor: "bg-gray-500/20",
    textColor: "text-gray-400",
  },
  neutral: {
    label: "Neutral",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-400",
  },
};

const sizeClasses = {
  sm: {
    badge: "px-2 py-1 text-xs",
    icon: "w-3 h-3",
  },
  md: {
    badge: "px-3 py-1.5 text-sm",
    icon: "w-4 h-4",
  },
  lg: {
    badge: "px-4 py-2 text-base",
    icon: "w-5 h-5",
  },
};

export function CIStatusBadge({
  state,
  count,
  size = "md",
}: CIStatusBadgeProps) {
  const config = stateConfig[state];
  const sizes = sizeClasses[size];

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${config.bgColor} ${config.textColor} ${sizes.badge} rounded-lg font-medium`}
    >
      {config.icon}
      <span>{config.label}</span>
      {count !== undefined && <span>({count})</span>}
    </div>
  );
}
```

### 2. `/web/src/components/ci/CIChecksList.tsx` (T030)

```typescript
/**
 * CI Checks List Component
 * Part of spec 009-projects - US3: View CI Check Status
 * T030: CIChecksList component
 */

import { CIStatusBadge } from "./CIStatusBadge";
import type { StatusCheck } from "@/types/ci-checks";

interface CIChecksListProps {
  checks: StatusCheck[];
  showDetails?: boolean;
}

export function CIChecksList({
  checks,
  showDetails = false,
}: CIChecksListProps) {
  if (checks.length === 0) {
    return (
      <div className="text-center py-6 text-on-surface-variant text-sm">
        <p>No CI checks found for this pull request.</p>
      </div>
    );
  }

  // Group checks by source
  const groupedChecks = checks.reduce(
    (acc, check) => {
      if (!acc[check.source]) {
        acc[check.source] = [];
      }
      acc[check.source].push(check);
      return acc;
    },
    {} as Record<string, StatusCheck[]>,
  );

  return (
    <div className="space-y-4">
      {Object.entries(groupedChecks).map(([source, sourceChecks]) => (
        <div key={source}>
          {/* Source Header */}
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-on-surface-variant uppercase tracking-wide">
            <span>{source.replace("-", " ")}</span>
            <span className="text-xs">({sourceChecks.length})</span>
          </div>

          {/* Checks List */}
          <div className="space-y-2">
            {sourceChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-3 p-3 bg-surface-variant/30 rounded-lg"
              >
                {/* Status Badge */}
                <div className="flex-shrink-0 pt-0.5">
                  <CIStatusBadge state={check.state} size="sm" />
                </div>

                {/* Check Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-on-surface truncate">
                      {check.name}
                    </h4>
                    {check.duration && (
                      <span className="text-xs text-on-surface-variant flex-shrink-0">
                        {formatDuration(check.duration)}
                      </span>
                    )}
                  </div>

                  {check.description && showDetails && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      {check.description}
                    </p>
                  )}

                  {(check.startedAt || check.completedAt) && showDetails && (
                    <div className="text-xs text-on-surface-variant/70 mt-1 flex gap-3">
                      {check.startedAt && (
                        <span>
                          Started: {new Date(check.startedAt).toLocaleString()}
                        </span>
                      )}
                      {check.completedAt && (
                        <span>
                          Completed:{" "}
                          {new Date(check.completedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Link to Details */}
                {check.url && (
                  <a
                    href={check.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-primary hover:text-primary/80 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
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
        </div>
      ))}
    </div>
  );
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
```

## Deployment Instructions

1. Create the CI components directory:
   ```bash
   mkdir -p web/src/components/ci
   ```

2. Copy the component files above into:
   - `web/src/components/ci/CIStatusBadge.tsx`
   - `web/src/components/ci/CIChecksList.tsx`

3. These components are ready to be integrated into PR pages (T031-T032)

## Usage Example

```typescript
import { CIStatusBadge } from "@/components/ci/CIStatusBadge";
import { CIChecksList } from "@/components/ci/CIChecksList";
import { getCIStatus } from "@/actions/ci-checks";

// In a server component
const ciStatus = await getCIStatus(projectSlug, prNumber);

// Display overall status
{ciStatus && (
  <CIStatusBadge
    state={ciStatus.overallStatus === "success" ? "passing" : 
           ciStatus.overallStatus === "failure" ? "failing" : "pending"}
  />
)}

// Display detailed checks list
{ciStatus && <CIChecksList checks={ciStatus.checks} showDetails={true} />}
```

## Implementation Status

- ✅ T029: CIStatusBadge component created
- ✅ T030: CIChecksList component created
- Next: T031-T032 (integrate into PR pages)
