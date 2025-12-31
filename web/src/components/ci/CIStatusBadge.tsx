import type { CICheckState } from "@/lib/types/ci-checks";

interface CIStatusBadgeProps {
  state: CICheckState;
  className?: string;
}

export function CIStatusBadge({ state, className = "" }: CIStatusBadgeProps) {
  const getBadgeStyles = () => {
    switch (state) {
      case "passing":
        return "bg-success/10 text-success border-success/20";
      case "failing":
        return "bg-error/10 text-error border-error/20";
      case "pending":
        return "bg-primary/10 text-primary border-primary/20";
      case "cancelled":
        return "bg-surface-variant text-on-surface-variant border-outline/20";
      case "skipped":
        return "bg-surface-variant text-on-surface-variant border-outline/20";
      default:
        return "bg-surface-variant text-on-surface-variant border-outline/20";
    }
  };

  const getIcon = () => {
    switch (state) {
      case "passing":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "failing":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "pending":
        return (
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        );
      case "cancelled":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        );
      case "skipped":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (state) {
      case "passing":
        return "Passing";
      case "failing":
        return "Failing";
      case "pending":
        return "Pending";
      case "cancelled":
        return "Cancelled";
      case "skipped":
        return "Skipped";
      default:
        return "Unknown";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getBadgeStyles()} ${className}`}
    >
      {getIcon()}
      {getLabel()}
    </span>
  );
}
