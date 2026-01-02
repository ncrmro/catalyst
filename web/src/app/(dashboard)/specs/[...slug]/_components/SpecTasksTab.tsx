"use client";

import { EntityCard } from "@/components/ui/entity-card";
import { WorkItemsList } from "@/components/work-items/WorkItemsList";
import type { PullRequest, Issue } from "@/types/reports";

interface SpecTasksTabProps {
  openPRs: PullRequest[];
  mergedPRs: PullRequest[];
  openIssues: Issue[];
  closedIssues: Issue[];
  projectSlug: string;
}

export function SpecTasksTab({
  openPRs,
  mergedPRs,
  openIssues,
  closedIssues,
  projectSlug,
}: SpecTasksTabProps) {
  const hasOpenWork = openPRs.length > 0 || openIssues.length > 0;
  const hasClosedWork = mergedPRs.length > 0 || closedIssues.length > 0;

  return (
    <div className="space-y-6">
      {/* Open Work Section */}
      <EntityCard
        title="Open Work"
        metadata={`${openPRs.length} PRs · ${openIssues.length} issues`}
        expandable
        expanded={hasOpenWork}
        size="sm"
        expandedContent={
          <div className="pt-2">
            <WorkItemsList
              prs={openPRs}
              issues={openIssues}
              projectSlug={projectSlug}
              emptyMessage="No open work for this spec"
            />
          </div>
        }
      />

      {/* Completed Work Section */}
      <EntityCard
        title="Completed Work"
        metadata={`${mergedPRs.length} PRs · ${closedIssues.length} issues`}
        expandable
        expanded={hasClosedWork}
        size="sm"
        expandedContent={
          <div className="pt-2">
            <WorkItemsList
              prs={mergedPRs}
              issues={closedIssues}
              projectSlug={projectSlug}
              emptyMessage="No completed work for this spec"
            />
          </div>
        }
      />
    </div>
  );
}
