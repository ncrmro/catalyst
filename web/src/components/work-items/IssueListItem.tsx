import type { Issue } from "@/types/reports";

interface IssueListItemProps {
  issue: Issue;
}

function getIssueTypeIconProps(type: Issue["type"]): {
  icon: string;
  className: string;
} {
  switch (type) {
    case "bug":
      return { icon: "bug_report", className: "text-error" };
    case "feature":
      return { icon: "add_circle", className: "text-primary" };
    case "improvement":
      return { icon: "trending_up", className: "text-secondary" };
    case "idea":
      return { icon: "lightbulb", className: "text-on-surface-variant" };
    default:
      return { icon: "help", className: "text-on-surface-variant" };
  }
}

export function IssueListItem({ issue }: IssueListItemProps) {
  const iconProps = getIssueTypeIconProps(issue.type);

  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-4 px-6 py-2.5 hover:bg-surface/50 transition-colors"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className={`material-symbols-outlined text-base ${iconProps.className}`}
        >
          {iconProps.icon}
        </span>
        <span className="text-xs text-on-surface-variant font-mono">
          #{issue.number}
        </span>
        <p className="text-on-surface text-sm truncate">{issue.title}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {/* State Badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            issue.state === "open"
              ? "bg-success/10 text-success"
              : "bg-surface-variant text-on-surface-variant"
          }`}
        >
          {issue.state === "open" ? "Open" : "Closed"}
        </span>

        {/* Priority Badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            issue.priority === "high"
              ? "bg-error/10 text-error"
              : issue.priority === "low"
                ? "bg-surface-variant text-on-surface-variant"
                : "bg-primary/10 text-primary"
          }`}
        >
          {issue.priority.charAt(0).toUpperCase()}
        </span>

        {/* Effort Estimate */}
        <span className="text-xs text-on-surface-variant">
          {issue.effort_estimate}
        </span>
      </div>
    </a>
  );
}
