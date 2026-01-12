import type { EnvironmentConfig } from "@/types/environment-config";
import { getZeroConfigStatus } from "@/lib/zero-config";
import { cn } from "@/lib/utils";

interface ZeroConfigBadgeProps {
  config: EnvironmentConfig | null | undefined;
  variant?: "inline" | "card";
  className?: string;
}

/**
 * Badge component that displays zero-config detection status.
 *
 * Shows whether a project has been successfully auto-detected (zero-config)
 * or requires manual configuration.
 */
export function ZeroConfigBadge({
  config,
  variant = "inline",
  className,
}: ZeroConfigBadgeProps) {
  const status = getZeroConfigStatus(config);

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full",
          status.isZeroConfig
            ? "bg-success-container text-on-success-container"
            : "bg-warning-container text-on-warning-container",
          className,
        )}
      >
        {status.isZeroConfig ? (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        <span>{status.title}</span>
      </span>
    );
  }

  // Card variant - more detailed display
  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        status.isZeroConfig
          ? "border-success/30 bg-success/5"
          : "border-warning/30 bg-warning/5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
            status.isZeroConfig ? "bg-success/20" : "bg-warning/20",
          )}
        >
          {status.isZeroConfig ? (
            <svg
              className="w-4 h-4 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-warning"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-on-surface">{status.title}</h4>
          <p className="text-sm text-on-surface-variant mt-1">
            {status.description}
          </p>
        </div>
      </div>
    </div>
  );
}
