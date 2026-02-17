"use client";

import { useEffect, useState } from "react";

const BANNER_DISMISSED_KEY = "billing-upgrade-banner-dismissed";

export interface UpgradeBannerProps {
  /**
   * Team ID for billing checks
   */
  teamId: string;
  /**
   * Current number of active environments
   */
  currentCount: number;
  /**
   * Maximum allowed environments for current plan
   */
  maxCount: number;
  /**
   * Whether billing is enabled
   * If false, banner will not render (no-op)
   */
  billingEnabled?: boolean;
  /**
   * Optional callback when upgrade button is clicked
   */
  onUpgradeClick?: () => void;
}

/**
 * UpgradeBanner - Displays when team is at or approaching environment limits
 *
 * Shows a warning banner with upgrade CTA when team is at/near their
 * environment limits. Follows the Glass design system patterns.
 * No-op when billing is disabled.
 *
 * @example
 * ```tsx
 * <UpgradeBanner
 *   teamId="team_123"
 *   currentCount={3}
 *   maxCount={3}
 *   billingEnabled={true}
 * />
 * ```
 */
export function UpgradeBanner({
  teamId,
  currentCount,
  maxCount,
  billingEnabled = true,
  onUpgradeClick,
}: UpgradeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check sessionStorage on mount
    const dismissed = sessionStorage.getItem(
      `${BANNER_DISMISSED_KEY}-${teamId}`,
    );
    setIsDismissed(dismissed === "true");
  }, [teamId]);

  const handleDismiss = () => {
    sessionStorage.setItem(`${BANNER_DISMISSED_KEY}-${teamId}`, "true");
    setIsDismissed(true);
  };

  // No-op when billing disabled
  if (!billingEnabled) return null;

  // Don't show if dismissed or not at/near limit
  if (isDismissed || currentCount < maxCount - 1) return null;

  const isAtLimit = currentCount >= maxCount;
  const isNearLimit = currentCount === maxCount - 1;

  return (
    <div
      className={`rounded-lg p-4 mb-6 flex items-center justify-between ${
        isAtLimit
          ? "bg-error-container/30 border border-error/30"
          : "bg-secondary-container/30 border border-secondary/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            isAtLimit ? "bg-error/20" : "bg-secondary/20"
          }`}
        >
          {isAtLimit ? (
            // Alert icon for at limit
            <svg
              className="w-5 h-5 text-error"
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
          ) : (
            // Warning icon for near limit
            <svg
              className="w-5 h-5 text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-on-surface">
            {isAtLimit
              ? "Environment limit reached"
              : "Approaching environment limit"}
          </p>
          <p className="text-xs text-on-surface-variant">
            {isAtLimit
              ? `You've reached your limit of ${maxCount} active environments. Upgrade to create more.`
              : `You have ${currentCount} of ${maxCount} active environments. Upgrade for more capacity.`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onUpgradeClick}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-opacity ${
            isAtLimit
              ? "bg-error text-on-error hover:opacity-90"
              : "bg-secondary text-on-secondary hover:opacity-90"
          }`}
        >
          Upgrade Plan
        </button>
        <button
          onClick={handleDismiss}
          className="p-2 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Dismiss banner"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
