import { cn } from "@/lib/utils";
import { TaskPriority } from "@/components/tasks/types";

export interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
  size?: "sm" | "md";
}

export function PriorityBadge({
  priority,
  className,
  size = "sm",
}: PriorityBadgeProps) {
  const getDots = () => {
    switch (priority) {
      case "critical":
        return "•••";
      case "high":
        return "•••";
      case "medium":
        return "••";
      case "low":
        return "•";
      default:
        return "•";
    }
  };

  const sizeClasses = {
    sm: "text-sm w-6",
    md: "text-base w-8",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-end font-bold tracking-tight text-on-surface-variant",
        sizeClasses[size],
        className,
      )}
      title={priority}
    >
      {getDots()}
    </span>
  );
}
