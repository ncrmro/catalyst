"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * CopyButton - A reusable component for copying text to clipboard
 * Shows a checkmark when successfully copied
 */
export function CopyButton({
  text,
  label = "Copy",
  className = "",
  iconClassName = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    
    const timeoutId = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors",
        className,
      )}
      aria-label={copied ? "Copied to clipboard" : `${label} to clipboard`}
      title={copied ? "Copied!" : label}
    >
      {copied ? (
        <>
          <svg
            className={cn("w-4 h-4 text-success", iconClassName)}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-success">Copied!</span>
        </>
      ) : (
        <>
          <svg
            className={cn("w-4 h-4", iconClassName)}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
