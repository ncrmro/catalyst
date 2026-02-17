"use client";

export interface UsageIndicatorProps {
  /**
   * Current usage count
   */
  current: number;
  /**
   * Maximum allowed count for current plan
   */
  max: number;
  /**
   * Label for the resource being counted
   * @default "environments"
   */
  label?: string;
  /**
   * Whether billing is enabled
   * If false, indicator will not render (no-op)
   */
  billingEnabled?: boolean;
  /**
   * Size variant
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * UsageIndicator - Displays usage count against limit
 *
 * Shows current resource usage vs. maximum allowed (e.g., "2/3 active environments used").
 * Follows the Glass design system patterns with semantic color coding:
 * - Green when well under limit
 * - Amber when approaching limit
 * - Red when at or over limit
 *
 * No-op when billing is disabled.
 *
 * @example
 * ```tsx
 * <UsageIndicator
 *   current={2}
 *   max={3}
 *   label="active environments"
 *   billingEnabled={true}
 * />
 * ```
 */
export function UsageIndicator({
  current,
  max,
  label = "environments",
  billingEnabled = true,
  size = "md",
  className,
}: UsageIndicatorProps) {
  // No-op when billing disabled
  if (!billingEnabled) return null;

  // Calculate usage percentage
  const percentage = max > 0 ? (current / max) * 100 : 0;

  // Determine status color based on usage
  const getStatusColor = () => {
    if (current >= max) return "text-error";
    if (percentage >= 80) return "text-secondary";
    return "text-on-surface";
  };

  const getProgressBarColor = () => {
    if (current >= max) return "bg-error";
    if (percentage >= 80) return "bg-secondary";
    return "bg-primary";
  };

  // Size variants
  const sizeClasses = {
    sm: {
      container: "text-xs",
      bar: "h-1",
      dot: "h-1.5 w-1.5",
    },
    md: {
      container: "text-sm",
      bar: "h-2",
      dot: "h-2 w-2",
    },
    lg: {
      container: "text-base",
      bar: "h-2.5",
      dot: "h-2.5 w-2.5",
    },
  };

  const statusColor = getStatusColor();
  const progressColor = getProgressBarColor();
  const sizes = sizeClasses[size];

  // Helper to combine class names
  const cn = (...classes: (string | undefined)[]) =>
    classes.filter(Boolean).join(" ");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn("flex items-center gap-2", sizes.container)}>
        {/* Status indicator dot */}
        <span
          className={cn(
            "inline-block rounded-full",
            progressColor,
            sizes.dot,
          )}
          role="status"
          aria-label={`${current} of ${max} ${label} used`}
        />

        {/* Usage text */}
        <span className={cn("font-medium", statusColor)}>
          {current}/{max}
        </span>

        {/* Label */}
        <span className="text-on-surface-variant">{label} used</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-variant/50 rounded-full overflow-hidden">
        <div
          className={cn(
            "transition-all duration-300 ease-in-out rounded-full",
            progressColor,
            sizes.bar,
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
