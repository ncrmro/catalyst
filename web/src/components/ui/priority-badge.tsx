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
  const getPriorityClasses = () => {
    switch (priority) {
      case "critical":
        return "bg-error text-on-error";
      case "high":
        return "bg-error-container text-on-error-container";
      case "medium":
        return "bg-secondary-container text-on-secondary-container";
      case "low":
        return "bg-surface-variant text-on-surface-variant";
      default:
        return "bg-surface-variant text-on-surface-variant";
    }
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium capitalize",
        getPriorityClasses(),
        sizeClasses[size],
        className,
      )}
    >
      {priority}
    </span>
  );
}
