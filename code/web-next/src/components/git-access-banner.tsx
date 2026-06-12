"use client";

import { useEffect, useState } from "react";

const BANNER_DISMISSED_KEY = "git-access-banner-dismissed";

interface GitAccessBannerProps {
  repoName?: string;
  errorType: "access_denied" | "not_found" | "error";
}

/**
 * Git Repository Access Warning Banner
 *
 * Displays a warning when repository content cannot be accessed.
 * Shows different messages based on error type (access denied vs generic error).
 * Can be dismissed per-session via sessionStorage.
 */
export function GitAccessBanner({ repoName, errorType }: GitAccessBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    // Check sessionStorage on mount
    const dismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  const isAccessDenied = errorType === "access_denied";

  return (
    <div
      className={`rounded-lg p-4 mb-6 flex items-center justify-between ${
        isAccessDenied
          ? "bg-warning-container/30 border border-warning/30"
          : "bg-surface-variant/50 border border-outline/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            isAccessDenied ? "bg-warning/20" : "bg-surface-variant"
          }`}
        >
          {isAccessDenied ? (
            // Lock icon for access denied
            <svg
              className="w-5 h-5 text-warning"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          ) : (
            // Info icon for generic error
            <svg
              className="w-5 h-5 text-on-surface-variant"
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
            {isAccessDenied
              ? "Unable to access repository content"
              : "Failed to load repository content"}
          </p>
          <p className="text-xs text-on-surface-variant">
            {isAccessDenied ? (
              <>
                Your GitHub session may have expired or permissions changed
                {repoName && (
                  <span className="text-on-surface-variant/70">
                    {" "}
                    for {repoName}
                  </span>
                )}
                .
              </>
            ) : (
              "Please try refreshing the page."
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isAccessDenied && (
          <a
            href="/account?highlight=github"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-warning text-on-warning hover:opacity-90 transition-opacity"
          >
            Reconnect GitHub
          </a>
        )}
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
