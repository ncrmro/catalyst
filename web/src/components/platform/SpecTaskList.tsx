import { GlassCard } from "@tetrastack/react-glass-components";

export type TaskStatus = "pending" | "in_progress" | "complete";

export interface SpecTask {
  id: string;
  taskId: string; // T001
  userStoryRef?: string; // US-1
  description: string;
  isParallelizable: boolean;
  status: TaskStatus;
  linkedPrNumber?: number;
  linkedPrUrl?: string;
}

export interface SpecTaskListProps {
  tasks: SpecTask[];
  onTaskClick?: (taskId: string) => void;
}

export function SpecTaskList({ tasks, onTaskClick }: SpecTaskListProps) {
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "complete":
        return (
          <div className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "in_progress":
        return (
          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" />
          </div>
        );
      case "pending":
        return <div className="w-5 h-5 rounded-full border-2 border-surface-variant" />;
    }
  };

  return (
    <GlassCard className="p-0">
      <div className="divide-y divide-white/10">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onTaskClick?.(task.id)}
            className={`p-4 flex items-start gap-4 transition-colors ${
              onTaskClick ? "cursor-pointer hover:bg-white/5" : ""
            }`}
          >
            <div className="mt-0.5 shrink-0">{getStatusIcon(task.status)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-on-surface-variant font-medium">{task.taskId}</span>
                {task.userStoryRef && (
                  <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {task.userStoryRef}
                  </span>
                )}
                {task.isParallelizable && (
                  <span className="font-mono text-xs text-secondary bg-secondary/10 px-1.5 py-0.5 rounded" title="Parallelizable">
                    [P]
                  </span>
                )}
              </div>
              <p
                className={`text-sm ${
                  task.status === "complete" ? "text-on-surface-variant line-through" : "text-on-surface"
                }`}
              >
                {task.description}
              </p>
            </div>

            {task.linkedPrNumber && (
              <div className="shrink-0">
                <a
                  href={task.linkedPrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors bg-surface-variant/30 px-2 py-1 rounded-full"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  #{task.linkedPrNumber}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
