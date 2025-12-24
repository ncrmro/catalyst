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
 * StatusBadge - A pill-shaped badge that displays status with appropriate colors
 *
 * Used throughout the application to show the status of environments,
 * agents, and other resources with semantic colors from Material Design 3.
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
  // Normalize status to lowercase for comparison
  const normalizedStatus = status.toLowerCase();

  // Status color mapping using Material Design 3 tokens
  const getStatusClasses = () => {
    switch (normalizedStatus) {
      case "ready":
      case "running":
        return "bg-success-container text-on-success-container";
      case "completed":
        return "bg-primary-container text-on-primary-container";
      case "deploying":
      case "provisioning":
        return "bg-secondary-container text-on-secondary-container";
      case "pending":
        return "bg-surface-variant text-on-surface-variant";
      case "failed":
        return "bg-error-container text-on-error-container";
      default:
        return "bg-surface-variant text-on-surface-variant";
    }
  };

  // Size variants
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium capitalize",
        getStatusClasses(),
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
