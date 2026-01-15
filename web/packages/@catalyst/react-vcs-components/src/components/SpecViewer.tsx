"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

/**
 * Types for the SpecViewer component
 */

export interface SpecFile {
  name: string;
  path: string;
  content: string;
  rendered?: ReactNode;
}

export interface SpecViewerProps {
  /**
   * List of spec files to display
   */
  specFiles: SpecFile[];
  
  /**
   * Currently active file name
   */
  activeFile?: string;
  
  /**
   * Callback when a file is selected
   */
  onFileSelect?: (fileName: string) => void;
  
  /**
   * Custom markdown renderer component
   * If not provided, displays raw content
   */
  MarkdownRenderer?: React.ComponentType<{ content: string }>;
  
  /**
   * Optional empty state message
   */
  emptyMessage?: string;

  /**
   * Base URL for file navigation
   * If provided, sidebar items will be links instead of buttons
   */
  baseHref?: string;
}

/**
 * SpecViewer - A component for viewing specification documents
 * 
 * Features:
 * - Displays markdown content with optional custom renderer
 * - File navigation sidebar
 * - Supports multiple spec files (spec.md, plan.md, tasks.md, etc.)
 */
export function SpecViewer({
  specFiles,
  activeFile,
  onFileSelect,
  MarkdownRenderer,
  emptyMessage = "No content available",
  baseHref,
}: SpecViewerProps) {
  const [selectedFileName, setSelectedFileName] = useState(
    activeFile || specFiles[0]?.name
  );

  // Sync selectedFileName with activeFile prop if it changes
  if (activeFile && activeFile !== selectedFileName) {
    setSelectedFileName(activeFile);
  }

  const handleFileSelect = (fileName: string) => {
    setSelectedFileName(fileName);
    onFileSelect?.(fileName);
  };

  const activeSpec = specFiles.find((f) => f.name === selectedFileName) || specFiles[0];

  if (!activeSpec) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-on-surface-variant">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* File Sidebar */}
      <aside className="w-48 border-r border-outline/30 p-3 flex-shrink-0">
        <h3 className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
          Files
        </h3>
        <nav className="space-y-1">
          {specFiles.map((file) => {
            const isActive = file.name === selectedFileName;
            const className = `w-full text-left px-2 py-1.5 rounded text-sm transition-colors block ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
            }`;

            if (baseHref) {
              return (
                <Link
                  key={file.name}
                  href={`${baseHref}/${file.name}`}
                  className={className}
                >
                  {file.name}
                </Link>
              );
            }

            return (
              <button
                key={file.name}
                onClick={() => handleFileSelect(file.name)}
                className={className}
              >
                {file.name}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {activeSpec.rendered ? (
            activeSpec.rendered
          ) : MarkdownRenderer ? (
            <MarkdownRenderer content={activeSpec.content} />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-on-surface">
              {activeSpec.content}
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}
