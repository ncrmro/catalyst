"use client";

import Link from "next/link";

/**
 * Types for the SpecFilesSidebar component
 */

export interface SpecFilesSidebarProps {
  /**
   * List of file names to display
   */
  files: string[];

  /**
   * Currently active file name
   */
  activeFile: string;

  /**
   * Callback when a file is clicked (for client-side navigation)
   * If not provided, uses Link component for navigation
   */
  onFileSelect?: (fileName: string) => void;

  /**
   * Base path for building file URLs (used with Link)
   * Example: "/projects/my-project/spec/001"
   */
  basePath?: string;

  /**
   * Optional back link configuration
   */
  backLink?: {
    href: string;
    label: string;
  };
}

/**
 * SpecFilesSidebar - A sidebar component for navigating between spec files
 *
 * Features:
 * - Displays list of spec files
 * - Highlights active file
 * - Supports both client-side callbacks and Next.js Links
 * - Optional back navigation link
 */
export function SpecFilesSidebar({
  files,
  activeFile,
  onFileSelect,
  basePath,
  backLink,
}: SpecFilesSidebarProps) {
  const handleFileClick = (fileName: string, e?: React.MouseEvent) => {
    if (onFileSelect) {
      e?.preventDefault();
      onFileSelect(fileName);
    }
  };

  return (
    <aside className="w-48 border-r border-outline/30 p-3 flex-shrink-0">
      <h3 className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
        Files
      </h3>

      {files.length > 0 ? (
        <nav className="space-y-1">
          {files.map((fileName) => {
            const isActive = fileName === activeFile;
            const href = basePath ? `${basePath}?file=${fileName}` : "#";

            return (
              <Link
                key={fileName}
                href={href}
                onClick={(e) => handleFileClick(fileName, e)}
                className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
                }`}
              >
                {fileName}
              </Link>
            );
          })}
        </nav>
      ) : (
        <p className="text-sm text-on-surface-variant">No files found</p>
      )}

      {/* Back link */}
      {backLink && (
        <div className="mt-6 pt-4 border-t border-outline/30">
          <Link
            href={backLink.href}
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {backLink.label}
          </Link>
        </div>
      )}
    </aside>
  );
}
