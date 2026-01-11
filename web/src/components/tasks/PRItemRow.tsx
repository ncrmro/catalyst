import Link from "next/link";
import { WorkItemPR } from "@/lib/work-categorization";

interface PRItemRowProps {
  pr: WorkItemPR;
  projectSlug: string;
}

/**
 * PRItemRow - Displays a single PR as a row in a list
 */
export function PRItemRow({ pr, projectSlug }: PRItemRowProps) {
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
        <p className="text-on-surface text-sm truncate font-medium">{pr.title}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {/* Status Badge */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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

        {/* Preview status indicator */}
        {pr.previewUrl && (
          <span
            className="w-2 h-2 rounded-full bg-success"
            title="Preview deployed"
          />
        )}

        {/* Author avatar */}
        {pr.authorAvatar && (
          <img
            src={pr.authorAvatar}
            alt={pr.author}
            className="w-5 h-5 rounded-full"
          />
        )}
      </div>
    </Link>
  );
}
