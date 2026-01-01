import type { PullRequest } from "@/types/reports";
import { PRListItem } from "@/components/work-items/PRTasksSection";

interface SpecTasksTabProps {
  openPRs: PullRequest[];
  mergedPRs: PullRequest[];
  projectSlug: string;
}

export function SpecTasksTab({
  openPRs,
  mergedPRs,
  projectSlug,
}: SpecTasksTabProps) {
  const hasOpenPRs = openPRs.length > 0;
  const hasMergedPRs = mergedPRs.length > 0;
  const hasContent = hasOpenPRs || hasMergedPRs;

  return (
    <div className="p-4 space-y-6">
      {/* Open Work Section */}
      <section>
        <h2 className="text-sm font-medium text-on-surface mb-3">Open Work</h2>
        {hasOpenPRs ? (
          <div className="rounded-lg border border-outline/30 divide-y divide-outline/30">
            {openPRs.map((pr) => (
              <PRListItem key={pr.id} pr={pr} projectSlug={projectSlug} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant py-4 text-center bg-surface-variant/30 rounded-lg">
            No open pull requests for this spec
          </p>
        )}
      </section>

      {/* Merged Work Section */}
      <section>
        <h2 className="text-sm font-medium text-on-surface mb-3">
          Merged Work
        </h2>
        {hasMergedPRs ? (
          <div className="rounded-lg border border-outline/30 divide-y divide-outline/30">
            {mergedPRs.map((pr) => (
              <PRListItem key={pr.id} pr={pr} projectSlug={projectSlug} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant py-4 text-center bg-surface-variant/30 rounded-lg">
            No merged pull requests for this spec
          </p>
        )}
      </section>

      {/* Empty state when no PRs at all */}
      {!hasContent && (
        <div className="text-center py-8">
          <p className="text-on-surface-variant">
            No pull requests found for this specification.
          </p>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            Create a PR with this spec name in the title or branch to track work
            here.
          </p>
        </div>
      )}
    </div>
  );
}
