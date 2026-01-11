import { WorkItemIssue } from "@/lib/work-categorization";

interface IssueItemRowProps {
  issue: WorkItemIssue;
}

/**
 * IssueItemRow - Displays a single GitHub issue as a row in a list
 */
export function IssueItemRow({ issue }: IssueItemRowProps) {
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-4 px-6 py-2.5 hover:bg-surface/50 transition-colors"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-on-surface-variant">•</span>
        <span className="text-xs text-on-surface-variant font-mono">
          #{issue.number}
        </span>
        <p className="text-on-surface text-sm truncate font-medium">{issue.title}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            issue.state === "open"
              ? "bg-primary/10 text-primary"
              : "bg-surface-variant text-on-surface-variant line-through"
          }`}
        >
          {issue.state === "open" ? "Issue" : "Closed"}
        </span>
      </div>
    </a>
  );
}
