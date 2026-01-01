import Link from "next/link";
import { GlassCard } from "@tetrastack/react-glass-components";
import type { PullRequest } from "@/types/reports";
import type { Spec, PRsBySpec } from "@/lib/pr-spec-matching";

export interface PRTasksSectionProps {
  /**
   * Section title (e.g., "Feature Tasks" or "Platform Tasks")
   */
  title: string;
  /**
   * All specs for the project (used for looking up spec info)
   */
  specs: Spec[];
  /**
   * PRs grouped by spec ID
   */
  prsBySpec: PRsBySpec;
  /**
   * Project slug for building links
   */
  projectSlug: string;
  /**
   * Optional link to specs page
   */
  specsLink?: string;
}

/**
 * PRTasksSection - Displays pull requests grouped by spec
 *
 * A component for displaying either feature or platform PRs,
 * grouped by their associated spec. Mirrors the TasksSection pattern.
 */
export function PRTasksSection({
  title,
  specs,
  prsBySpec,
  projectSlug,
  specsLink,
}: PRTasksSectionProps) {
  const specIds = Object.keys(prsBySpec.bySpec);
  const totalPRs =
    specIds.reduce((sum, id) => sum + prsBySpec.bySpec[id].length, 0) +
    prsBySpec.noSpec.length;

  // Build spec lookup for names
  const specLookup = new Map(specs.map((s) => [s.id, s]));

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
        <div className="flex items-center gap-4">
          {specsLink && (
            <Link
              href={specsLink}
              className="text-sm text-primary hover:underline uppercase"
            >
              Specs
            </Link>
          )}
        </div>
      </div>

      {totalPRs > 0 ? (
        <div className="space-y-4 -mx-6">
          {/* PRs grouped by spec */}
          {specIds.map((specId) => {
            const spec = specLookup.get(specId);
            const prs = prsBySpec.bySpec[specId];

            return (
              <div key={specId}>
                {/* Spec Header */}
                <Link
                  href={spec?.href || `/projects/${projectSlug}/spec/${specId}`}
                  className="flex items-center gap-2 px-6 py-2 bg-surface-container/50 hover:bg-surface-container transition-colors"
                >
                  <span className="text-sm font-medium text-primary">
                    {spec?.name || specId}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    ({prs.length} PR{prs.length !== 1 ? "s" : ""})
                  </span>
                </Link>
                {/* PRs in this spec */}
                <div className="divide-y divide-outline/30">
                  {prs.map((pr) => (
                    <PRListItem key={pr.id} pr={pr} projectSlug={projectSlug} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* PRs without a spec */}
          {prsBySpec.noSpec.length > 0 && (
            <div>
              <div className="px-6 py-2 bg-surface-container/50">
                <span className="text-sm font-medium text-on-surface-variant">
                  No Spec
                </span>
                <span className="text-xs text-on-surface-variant ml-2">
                  ({prsBySpec.noSpec.length} PR
                  {prsBySpec.noSpec.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="divide-y divide-outline/30">
                {prsBySpec.noSpec.map((pr) => (
                  <PRListItem key={pr.id} pr={pr} projectSlug={projectSlug} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="text-on-surface-variant">No pull requests</p>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            PRs matching this category will appear here
          </p>
        </div>
      )}
    </GlassCard>
  );
}

/**
 * Compact PR list item for display within spec groups
 */
export function PRListItem({
  pr,
  projectSlug,
}: {
  pr: PullRequest;
  projectSlug: string;
}) {
  return (
    <Link
      href={`/projects/${projectSlug}/prs/${pr.number}`}
      className="flex items-center justify-between gap-4 px-6 py-2.5 hover:bg-surface/50 transition-colors"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-on-surface-variant">•</span>
        <span className="text-xs text-on-surface-variant font-mono">
          #{pr.number}
        </span>
        <p className="text-on-surface text-sm truncate">{pr.title}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {/* Status Badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            pr.status === "draft"
              ? "bg-surface-variant text-on-surface-variant"
              : pr.status === "changes_requested"
                ? "bg-error/10 text-error"
                : "bg-success/10 text-success"
          }`}
        >
          {pr.status === "draft" && "Draft"}
          {pr.status === "changes_requested" && "Changes"}
          {pr.status === "ready" && "Ready"}
        </span>

        {/* Priority Badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            pr.priority === "high"
              ? "bg-error/10 text-error"
              : pr.priority === "low"
                ? "bg-surface-variant text-on-surface-variant"
                : "bg-primary/10 text-primary"
          }`}
        >
          {pr.priority.charAt(0).toUpperCase()}
        </span>

        {/* Preview status indicator */}
        {pr.previewUrl && pr.previewStatus === "running" && (
          <span
            className="w-2 h-2 rounded-full bg-success"
            title="Preview running"
          />
        )}

        {/* Author avatar */}
        {pr.author_avatar && (
          <img
            src={pr.author_avatar}
            alt={pr.author}
            className="w-5 h-5 rounded-full"
          />
        )}
      </div>
    </Link>
  );
}
