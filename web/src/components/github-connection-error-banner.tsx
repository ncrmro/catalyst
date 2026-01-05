"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

const BANNER_DISMISSED_KEY = "github-connection-error-dismissed";

interface GitHubConnectionErrorBannerProps {
  errorMessage?: string;
}

/**
 * GitHub Connection Error Banner
 *
 * Displays when GitHub API requests fail due to authentication/authorization issues.
 * Prompts users to reconnect their GitHub account.
 * Can be dismissed per-session via sessionStorage.
 */
export function GitHubConnectionErrorBanner({
  errorMessage = "Unable to connect to GitHub. Your authentication may have expired or requires additional permissions.",
}: GitHubConnectionErrorBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check sessionStorage on mount
    const dismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  const handleReconnect = async () => {
    // Clear the dismissed state so banner shows again after reconnection if needed
    sessionStorage.removeItem(BANNER_DISMISSED_KEY);
    // Trigger GitHub OAuth flow
    await signIn("github", { callbackUrl: window.location.href });
  };

  if (isDismissed) return null;

  return (
    <div className="bg-error/10 border border-error/30 rounded-lg p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
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
        </div>
        <div>
          <p className="text-sm font-medium text-on-surface">
            GitHub Connection Error
          </p>
          <p className="text-xs text-on-surface-variant">{errorMessage}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleReconnect}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-error text-white hover:opacity-90 transition-opacity"
        >
          Reconnect GitHub
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
