import { WorkItemBranch } from "@/lib/work-categorization";

interface BranchItemRowProps {
  branch: WorkItemBranch;
}

/**
 * Format date as relative time without external library
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "yesterday";
  return `${diffInDays}d ago`;
}

/**
 * BranchItemRow - Displays a single active branch as a row in a list
 */
export function BranchItemRow({ branch }: BranchItemRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-2.5 hover:bg-surface/50 transition-colors cursor-default">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-on-surface-variant">•</span>
        <svg 
          className="w-3.5 h-3.5 text-on-surface-variant" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 7v8a2 2 0 002 2h6M8 7a2 2 0 114 0 2 2 0 01-4 0zM18 15a2 2 0 11-4 0 2 2 0 014 0z" 
          />
        </svg>
        <p className="text-on-surface text-sm truncate font-medium">{branch.name}</p>
        <span className="text-[10px] text-on-surface-variant bg-surface-variant/30 px-1.5 py-0.5 rounded">
          Branch
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-on-surface-variant">
          {formatRelativeTime(branch.lastCommitDate)}
        </span>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-on-surface-variant truncate max-w-[100px]">
            {branch.lastCommitAuthor}
          </span>
        </div>
      </div>
    </div>
  );
}
