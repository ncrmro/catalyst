"use client";

import { useState } from "react";
import type { SourceConfig } from "@/types/crd";

interface SourceManagerProps {
  initialSources: SourceConfig[];
  onSave: (
    sources: SourceConfig[],
  ) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Component for managing multiple source repositories in a project
 */
export function SourceManager({ initialSources, onSave }: SourceManagerProps) {
  const [sources, setSources] = useState<SourceConfig[]>(
    initialSources.length > 0
      ? initialSources
      : [{ name: "primary", repositoryUrl: "", branch: "main" }],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddSource = () => {
    setSources([
      ...sources,
      { name: `source-${sources.length}`, repositoryUrl: "", branch: "main" },
    ]);
  };

  const handleRemoveSource = (index: number) => {
    // Don't allow removing the last source
    if (sources.length === 1) {
      setError("Projects must have at least one source repository");
      return;
    }
    setSources(sources.filter((_, i) => i !== index));
    setError(null);
  };

  const handleUpdateSource = (
    index: number,
    field: keyof SourceConfig,
    value: string,
  ) => {
    const updated = [...sources];
    updated[index] = { ...updated[index], [field]: value };
    setSources(updated);
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    // Validate sources
    for (const source of sources) {
      if (!source.name || !source.repositoryUrl || !source.branch) {
        setError("All fields are required for each source");
        setIsSaving(false);
        return;
      }
    }

    try {
      const result = await onSave(sources);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Failed to save sources");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-on-surface">Repository Sources</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Configure multiple source repositories for this project. Use the
            &quot;primary&quot; source for the main codebase.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddSource}
          className="px-3 py-1.5 text-sm font-medium bg-primary text-on-primary rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Source
        </button>
      </div>

      {/* Sources List */}
      <div className="space-y-3">
        {sources.map((source, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border border-outline bg-surface-container space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface">
                Source #{index + 1}
                {source.name === "primary" && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                    Primary
                  </span>
                )}
              </span>
              {sources.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSource(index)}
                  className="text-sm text-error hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., primary, frontend, backend"
                  value={source.name}
                  onChange={(e) =>
                    handleUpdateSource(index, "name", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-md border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Repository URL
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/org/repo"
                  value={source.repositoryUrl}
                  onChange={(e) =>
                    handleUpdateSource(index, "repositoryUrl", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-md border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Default Branch
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={source.branch}
                  onChange={(e) =>
                    handleUpdateSource(index, "branch", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-md border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-md bg-error/10 text-error border border-error/20 text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 rounded-md bg-success/10 text-success border border-success/20 text-sm">
          Sources saved successfully
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 text-sm font-medium bg-primary text-on-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Sources"}
        </button>
      </div>
    </div>
  );
}
