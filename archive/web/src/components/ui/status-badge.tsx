import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  /**
   * The status to display
   */
  status:
    | "ready"
    | "running"
    | "completed"
    | "deploying"
    | "provisioning"
    | "pending"
    | "failed"
    | string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Size variant
   * @default "sm"
   */
  size?: "xs" | "sm" | "md";
}

/**
 * StatusBadge - A text label that displays status
 *
 * Used throughout the application to show the status of environments,
 * agents, and other resources.
 *
 * @example
 * ```tsx
 * <StatusBadge status="running" />
 * <StatusBadge status="failed" size="md" />
 * <StatusBadge status="completed" className="font-bold" />
 * ```
 */
export function StatusBadge({
  status,
  className,
  size = "sm",
}: StatusBadgeProps) {
  // Size variants
  const sizeClasses = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center text-on-surface-variant capitalize",
        sizeClasses[size],
        className,
      )}
      role="status"
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}
