import { cn } from "@/lib/utils";

export interface StatusIndicatorProps {
  /**
   * The status to display
   */
  status: "running" | "pending" | "failed" | "completed";
  /**
   * Size of the indicator
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Accessible label for screen readers
   */
  "aria-label"?: string;
}

/**
 * StatusIndicator - A colored dot that indicates status
 *
 * Used throughout the application to show the status of agents,
 * containers, deployments, and other resources.
 *
 * @example
 * ```tsx
 * <StatusIndicator status="running" />
 * <StatusIndicator status="failed" size="lg" aria-label="Deployment failed" />
 * ```
 */
export function StatusIndicator({
  status,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: StatusIndicatorProps) {
  // Status color mapping
  const statusColors = {
    running: "bg-yellow-500",
    completed: "bg-green-500",
    pending: "bg-gray-500",
    failed: "bg-red-500",
  };

  // Size variants
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        statusColors[status],
        sizeClasses[size],
        className,
      )}
      role="status"
      aria-label={ariaLabel || `Status: ${status}`}
    />
  );
}
