"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";
import { listDirectory, type VCSEntry } from "@/actions/version-control-provider";
import { distillSpec } from "@/actions/spec-workflow";
import { MarkdownRenderer } from "@tetrastack/react-markdown";

interface DistillSpecPanelProps {
  projectId: string;
  repoFullName?: string;
}

export function DistillSpecPanel({ projectId, repoFullName }: DistillSpecPanelProps) {
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [files, setFiles] = useState<VCSEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState("");
  const [distilling, setDistilling] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (repoFullName) {
      loadFiles();
    }
  }, [repoFullName]);

  const loadFiles = async () => {
    if (!repoFullName) return;
    setLoadingFiles(true);
    try {
      // For now, just list root files and some common directories
      // A real implementation would allow navigating the tree
      const result = await listDirectory(repoFullName, "");
      if (result.success) {
        setFiles(result.entries);
      }
    } catch (err) {
      console.error("Failed to load files", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const toggleFile = (path: string) => {
    const next = new Set(selectedFiles);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedFiles(next);
  };

  const handleDistill = async () => {
    if (selectedFiles.size === 0) {
      setError("Please select at least one file.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide a description of what you want to distill.");
      return;
    }

    setDistilling(true);
    setError(null);
    try {
      const res = await distillSpec(projectId, description, Array.from(selectedFiles));
      if (res.success && res.specContent) {
        setResult(res.specContent);
      } else {
        setError(res.error || "Failed to distill spec.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setDistilling(false);
    }
  };

  if (result) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Generated Specification</h2>
        <div className="prose prose-invert max-w-none bg-surface-variant/20 p-6 rounded-lg border border-outline/20 mb-6 max-h-[500px] overflow-y-auto">
          <MarkdownRenderer content={result} />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setResult(null)}
            className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors"
          >
            Start Over
          </button>
          <button
            className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => alert("Save functionality coming soon!")}
          >
            Create Spec File
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-8">
      <h2 className="text-xl font-semibold text-on-surface mb-2">Distill Spec from Code</h2>
      <p className="text-on-surface-variant mb-6">
        Select files that implement a feature and describe what you want to capture.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            1. Select Files
          </h3>
          <div className="border border-outline/20 rounded-lg bg-surface-variant/10 h-64 overflow-y-auto p-2">
            {loadingFiles ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : files.length > 0 ? (
              <div className="space-y-1">
                {files.map((file) => (
                  <label
                    key={file.path}
                    className="flex items-center gap-3 p-2 rounded hover:bg-surface-variant/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.path)}
                      onChange={() => toggleFile(file.path)}
                      className="rounded border-outline/50 text-primary focus:ring-primary/50 bg-transparent"
                    />
                    <span className="text-sm text-on-surface truncate">
                      {file.type === "dir" ? "📁" : "📄"} {file.name}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-on-surface-variant text-sm">
                No files found or repository not connected.
              </div>
            )}
          </div>
          <p className="text-xs text-on-surface-variant">
            {selectedFiles.size} files selected
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            2. Describe Context
          </h3>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Explain the user authentication flow implemented in these files."
            className="w-full h-64 p-4 rounded-lg bg-surface-variant/20 border border-outline/30 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleDistill}
          disabled={distilling || selectedFiles.size === 0 || !description.trim()}
          className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {distilling ? (
            <>
              <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Analyzing Code...
            </>
          ) : (
            "Generate Spec"
          )}
        </button>
      </div>
    </GlassCard>
  );
}
