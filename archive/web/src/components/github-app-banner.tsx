"use client";

import { useEffect, useState } from "react";

const BANNER_DISMISSED_KEY = "github-app-banner-dismissed";

/**
 * GitHub App Installation Banner
 *
 * Prompts users to install the GitHub App if they haven't already.
 * Links directly to GitHub's app installation page using NEXT_PUBLIC_GITHUB_APP_URL.
 * Can be dismissed per-session via sessionStorage.
 */
export function GitHubAppBanner() {
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

  const githubAppUrl = process.env.NEXT_PUBLIC_GITHUB_APP_URL;

  if (isDismissed || !githubAppUrl) return null;

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-primary"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-on-surface">
            Install the GitHub App for full functionality
          </p>
          <p className="text-xs text-on-surface-variant">
            Get webhooks, automated deployments, and PR preview environments.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={githubAppUrl}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity"
        >
          Install Now
        </a>
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
