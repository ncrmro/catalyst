import { GlassCard } from "@tetrastack/react-glass-components";

export type TaskType = "dependency_update" | "convention_fix" | "flaky_test";
export type PlatformTaskStatus = "pending" | "running" | "failed" | "completed";

export interface PlatformTask {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  status: PlatformTaskStatus;
  priority: "low" | "medium" | "high";
  createdAt: Date;
  retryCount: number;
}

export interface PlatformTaskQueueProps {
  tasks: PlatformTask[];
  onRetry?: (taskId: string) => void;
  onApprove?: (taskId: string) => void;
  onDismiss?: (taskId: string) => void;
}

export function PlatformTaskQueue({ tasks, onRetry, onApprove, onDismiss }: PlatformTaskQueueProps) {
  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case "dependency_update":
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case "convention_fix":
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case "flaky_test":
        return (
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
    }
  };

  const getStatusBadge = (status: PlatformTaskStatus) => {
    switch (status) {
      case "running":
        return "bg-primary/10 text-primary border-primary/20 animate-pulse";
      case "failed":
        return "bg-error/10 text-error border-error/20";
      case "completed":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-surface-variant text-on-surface-variant border-white/10";
    }
  };

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <GlassCard className="text-center py-12">
          <div className="w-12 h-12 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4 text-on-surface-variant">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-on-surface">All caught up!</h3>
          <p className="text-on-surface-variant">No pending platform tasks</p>
        </GlassCard>
      ) : (
        tasks.map((task) => (
          <GlassCard key={task.id} className="group hover:border-white/20 transition-colors">
            <div className="flex items-start gap-4">
              {getTypeIcon(task.type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-on-surface truncate pr-4">{task.title}</h4>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border uppercase tracking-wide ${getStatusBadge(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                
                <p className="text-sm text-on-surface-variant mb-3">{task.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                  <span>Created {task.createdAt.toLocaleDateString()}</span>
                  {task.retryCount > 0 && <span>Retries: {task.retryCount}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {task.status === "failed" && onRetry && (
                  <button
                    onClick={() => onRetry(task.id)}
                    className="p-2 rounded bg-surface-variant hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
                    title="Retry task"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
                
                {task.status === "pending" && onApprove && (
                  <button
                    onClick={() => onApprove(task.id)}
                    className="p-2 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    title="Run task"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}

                {onDismiss && (
                  <button
                    onClick={() => onDismiss(task.id)}
                    className="p-2 rounded bg-surface-variant hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors"
                    title="Dismiss"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </GlassCard>
        ))
      )}
    </div>
  );
}
