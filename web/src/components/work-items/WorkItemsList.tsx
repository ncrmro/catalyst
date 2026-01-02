import type { Issue, PullRequest } from "@/types/reports";
import { IssueListItem } from "./IssueListItem";
import { PRListItem } from "./PRTasksSection";

interface WorkItemsListProps {
	prs?: PullRequest[];
	issues?: Issue[];
	projectSlug: string;
	emptyMessage?: string;
}

/**
 * Reusable component for displaying a list of PRs and/or Issues.
 * Used by both the project page (TasksSectionCard) and spec page (SpecTasksTab).
 */
export function WorkItemsList({
	prs = [],
	issues = [],
	projectSlug,
	emptyMessage = "No items",
}: WorkItemsListProps) {
	const hasItems = prs.length > 0 || issues.length > 0;

	if (!hasItems) {
		return (
			<p className="text-sm text-on-surface-variant py-4 text-center bg-surface-variant/30 rounded-lg">
				{emptyMessage}
			</p>
		);
	}

	return (
		<div className="rounded-lg border border-outline/30 divide-y divide-outline/30">
			{prs.map((pr) => (
				<PRListItem key={`pr-${pr.id}`} pr={pr} projectSlug={projectSlug} />
			))}
			{issues.map((issue) => (
				<IssueListItem key={`issue-${issue.id}`} issue={issue} />
			))}
		</div>
	);
}
