import { GlassCard } from "@tetrastack/react-glass-components";
import { MarkdownRenderer } from "@tetrastack/react-markdown";

export interface AgentContextViewerProps {
  content: string;
  lastGeneratedAt: Date;
  needsRefresh: boolean;
  onRefresh?: () => void;
}

export function AgentContextViewer({
  content,
  lastGeneratedAt,
  needsRefresh,
  onRefresh,
}: AgentContextViewerProps) {
  return (
    <GlassCard className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline/30">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">
            Agent Context
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-on-surface-variant">
              Generated {lastGeneratedAt.toLocaleString()}
            </span>
            {needsRefresh && (
              <span className="text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                Outdated
              </span>
            )}
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              needsRefresh
                ? "bg-primary text-on-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                : "bg-surface-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/80"
            }`}
          >
            {needsRefresh ? "Refresh Context" : "Regenerate"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <MarkdownRenderer content={content} />
      </div>
    </GlassCard>
  );
}
