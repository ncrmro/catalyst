"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";
import { fetchProjectSpecs } from "@/actions/specs";
import { addCodeAnnotations } from "@/actions/spec-workflow";
import type { Spec } from "@/lib/pr-spec-matching";

interface CodeAnnotationsPanelProps {
  projectId: string;
  projectSlug: string;
}

export function CodeAnnotationsPanel({ projectId, projectSlug }: CodeAnnotationsPanelProps) {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState("");
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<{ filePath: string; line: number; frId: string; suggestion: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSpecs();
  }, []);

  const loadSpecs = async () => {
    setLoadingSpecs(true);
    try {
      const res = await fetchProjectSpecs(projectId, projectSlug);
      setSpecs(res);
      if (res.length > 0) {
        setSelectedSpecId(res[0].id);
      }
    } catch (err) {
      console.error("Failed to load specs", err);
    } finally {
      setLoadingSpecs(false);
    }
  };

  const handleScan = async () => {
    if (!selectedSpecId) {
      setError("Please select a specification to scan.");
      return;
    }

    setScanning(true);
    setError(null);
    try {
      const specPath = `specs/${selectedSpecId}/spec.md`;
      const res = await addCodeAnnotations(projectId, specPath);
      if (res.success && res.annotations) {
        setResults(res.annotations);
      } else {
        setError(res.error || "Failed to scan codebase.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  if (results) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Code Annotation Suggestions</h2>
        <p className="text-on-surface-variant mb-6">
          AI found the following locations that implement functional requirements from <strong>{selectedSpecId}</strong>.
        </p>

        <div className="space-y-3 mb-8">
          {results.map((ann, idx) => (
            <div key={idx} className="p-4 bg-surface-variant/20 border border-outline/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <code className="text-sm font-mono text-primary">{ann.filePath}:{ann.line}</code>
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded">{ann.frId}</span>
              </div>
              <p className="text-sm text-on-surface-variant italic">{ann.suggestion}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setResults(null)}
            className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => alert("Application of annotations coming soon!")}
          >
            Create Annotation PR
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-8">
      <h2 className="text-xl font-semibold text-on-surface mb-2">Code Annotations</h2>
      <p className="text-on-surface-variant mb-6">
        Automatically identify code that implements functional requirements and add mapping comments.
      </p>

      <div className="space-y-4 mb-8">
        <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
          Select Specification
        </h3>
        <div className="border border-outline/20 rounded-lg bg-surface-variant/10 max-h-64 overflow-y-auto p-2">
          {loadingSpecs ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : specs.length > 0 ? (
            <div className="space-y-1">
              {specs.map((spec) => (
                <label
                  key={spec.id}
                  className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${
                    selectedSpecId === spec.id ? "bg-primary/20 border-primary/30" : "hover:bg-surface-variant/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="spec-annotate"
                    checked={selectedSpecId === spec.id}
                    onChange={() => setSelectedSpecId(spec.id)}
                    className="hidden"
                  />
                  <span className={`text-sm ${selectedSpecId === spec.id ? "text-primary font-medium" : "text-on-surface"}`}>
                    📄 {spec.name}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-on-surface-variant text-sm">
              No specifications found.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleScan}
          disabled={scanning || !selectedSpecId}
          className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {scanning ? (
            <>
              <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Scanning Codebase...
            </>
          ) : (
            "Start Scan"
          )}
        </button>
      </div>
    </GlassCard>
  );
}
