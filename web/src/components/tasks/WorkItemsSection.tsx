import Link from "next/link";
import { GlassCard } from "@tetrastack/react-glass-components";
import { WorkItem, WorkItemPR, WorkItemBranch, WorkItemIssue } from "@/lib/work-categorization";
import { PRItemRow } from "./PRItemRow";
import { BranchItemRow } from "./BranchItemRow";
import { IssueItemRow } from "./IssueItemRow";
import type { Spec } from "@/actions/specs";

export interface WorkItemsSectionProps {
  /**
   * Section title (e.g., "Feature Tasks" or "Platform Tasks")
   */
  title: string;
  /**
   * All work items (PRs, branches, and issues) to display
   */
  items: WorkItem[];
  /**
   * All specs for the project (used for looking up spec info)
   */
  specs: Spec[];
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
 * WorkItemsSection - Displays PRs, active branches, and issues grouped by spec
 *
 * Organized into Feature Tasks and Platform Tasks sections.
 * PRs, branches, and issues are displayed in separate sub-sections within each spec group.
 */
export function WorkItemsSection({
  title,
  items,
  specs,
  projectSlug,
  specsLink,
}: WorkItemsSectionProps) {
  // Build spec lookup for names
  const specLookup = new Map(specs.map((s) => [s.id, s]));

  // Group items by spec ID
  const groupedBySpec: Record<string, { prs: WorkItemPR[]; branches: WorkItemBranch[]; issues: WorkItemIssue[] }> = {};
  const noSpec: { prs: WorkItemPR[]; branches: WorkItemBranch[]; issues: WorkItemIssue[] } = { prs: [], branches: [], issues: [] };

  items.forEach((item) => {
    const target = item.specId ? (groupedBySpec[item.specId] = groupedBySpec[item.specId] || { prs: [], branches: [], issues: [] }) : noSpec;
    if (item.kind === "pr") {
      target.prs.push(item);
    } else if (item.kind === "branch") {
      target.branches.push(item);
    } else {
      target.issues.push(item);
    }
  });

  const specIds = Object.keys(groupedBySpec).sort();
  const hasItems = items.length > 0;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
        <div className="flex items-center gap-4">
          {specsLink && (
            <Link
              href={specsLink}
              className="text-sm text-primary hover:underline uppercase font-bold tracking-wider"
            >
              Specs
            </Link>
          )}
        </div>
      </div>

      {hasItems ? (
        <div className="space-y-4 -mx-6">
          {/* Grouped by Spec */}
          {specIds.map((specId) => {
            const spec = specLookup.get(specId);
            const { prs, branches, issues } = groupedBySpec[specId];

            return (
              <div key={specId}>
                {/* Spec Header */}
                <Link
                  href={spec?.href || `/projects/${projectSlug}/spec/${specId}`}
                  className="flex items-center gap-2 px-6 py-2 bg-surface-container/50 hover:bg-surface-container transition-colors"
                >
                  <span className="text-sm font-bold text-primary">
                    {spec?.name || specId}
                  </span>
                  <span className="text-[10px] text-on-surface-variant uppercase font-medium">
                    {prs.length + branches.length + issues.length} items
                  </span>
                </Link>
                
                {/* Items */}
                <div className="divide-y divide-outline/30">
                  {prs.map((pr) => (
                    <PRItemRow key={pr.id} pr={pr} projectSlug={projectSlug} />
                  ))}
                  {branches.map((branch) => (
                    <BranchItemRow key={branch.id} branch={branch} />
                  ))}
                  {issues.map((issue) => (
                    <IssueItemRow key={issue.id} issue={issue} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Items without a spec */}
          {(noSpec.prs.length > 0 || noSpec.branches.length > 0 || noSpec.issues.length > 0) && (
            <div>
              <div className="px-6 py-2 bg-surface-container/50">
                <span className="text-sm font-bold text-on-surface-variant uppercase tracking-tight">
                  No Spec
                </span>
                <span className="text-[10px] text-on-surface-variant ml-2 uppercase font-medium">
                  {noSpec.prs.length + noSpec.branches.length + noSpec.issues.length} items
                </span>
              </div>
              <div className="divide-y divide-outline/30">
                {noSpec.prs.map((pr) => (
                  <PRItemRow key={pr.id} pr={pr} projectSlug={projectSlug} />
                ))}
                {noSpec.branches.map((branch) => (
                  <BranchItemRow key={branch.id} branch={branch} />
                ))}
                {noSpec.issues.map((issue) => (
                  <IssueItemRow key={issue.id} issue={issue} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="w-12 h-12 mx-auto text-on-surface-variant/30 mb-4"
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
          <p className="text-on-surface-variant font-medium">No active tasks</p>
          <p className="text-sm text-on-surface-variant/60 mt-1">
            Open PRs and active branches will appear here
          </p>
        </div>
      )}
    </GlassCard>
  );
}
