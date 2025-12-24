import { cn } from "@/lib/utils";
import { StatusIndicator } from "./ui/status-indicator";
import { StatusBadge } from "./ui/status-badge";
import { LogViewer } from "./log-viewer";

export interface AgentRunCardProps {
  /**
   * Unique identifier for the agent run
   */
  id: string;
  /**
   * Agent type/name
   */
  agent: string;
  /**
   * Goal or description of what the agent is doing
   */
  goal: string;
  /**
   * Current status of the agent run
   */
  status: "running" | "pending" | "failed" | "completed";
  /**
   * Start time as a formatted string
   */
  startTime: string;
  /**
   * Duration as a formatted string (e.g., "8m 20s")
   */
  duration: string;
  /**
   * Agent logs
   */
  logs: string;
  /**
   * Whether the card is expanded to show logs
   * @default false
   */
  isExpanded?: boolean;
  /**
   * Callback when the card is toggled
   */
  onToggle?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const ChevronIcon = ({ isExpanded }: { isExpanded: boolean }) => (
  <svg
    className={cn(
      "w-4 h-4 text-on-surface-variant transition-transform",
      isExpanded && "rotate-180",
    )}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

/**
 * AgentRunCard - A molecule component for displaying agent run information
 *
 * Shows agent status, goal, timing information, and expandable logs.
 * Used in agent run lists to display individual agent execution details.
 *
 * @example
 * ```tsx
 * <AgentRunCard
 *   id="agent-1"
 *   agent="implementation-agent"
 *   goal="Implement preview environments feature"
 *   status="completed"
 *   startTime="2024-12-18 10:15:00"
 *   duration="8m 20s"
 *   logs="[10:15:00] Agent started..."
 *   isExpanded={expandedId === "agent-1"}
 *   onToggle={() => setExpandedId("agent-1")}
 * />
 * ```
 */
export function AgentRunCard({
  id,
  agent,
  goal,
  status,
  startTime,
  duration,
  logs,
  isExpanded = false,
  onToggle,
  className,
}: AgentRunCardProps) {
  return (
    <div
      className={cn(
        "border border-outline/50 rounded-lg overflow-hidden",
        className,
      )}
    >
      {/* Agent Run Header */}
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors",
          isExpanded ? "bg-primary/5" : "hover:bg-surface/50",
        )}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle?.();
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`${agent} - ${status}`}
      >
        <StatusIndicator status={status} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-on-surface">{agent}</span>
            <StatusBadge status={status} size="xs" />
          </div>
          <p className="text-sm text-on-surface-variant truncate">{goal}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-on-surface-variant">{startTime}</div>
          <div className="text-xs text-on-surface-variant">{duration}</div>
        </div>
        <ChevronIcon isExpanded={isExpanded} />
      </div>

      {/* Agent Logs (Expandable) */}
      {isExpanded && (
        <div className="border-t border-outline/50">
          <LogViewer logs={logs} maxHeight="max-h-64" />
        </div>
      )}
    </div>
  );
}
