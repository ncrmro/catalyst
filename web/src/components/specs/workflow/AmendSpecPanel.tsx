"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";
import { fetchProjectSpecs } from "@/actions/specs";
import { amendSpec } from "@/actions/spec-workflow";
import { MarkdownRenderer } from "@tetrastack/react-markdown";
import type { Spec } from "@/lib/pr-spec-matching";

interface AmendSpecPanelProps {
  projectId: string;
  projectSlug: string;
}

export function AmendSpecPanel({ projectId, projectSlug }: AmendSpecPanelProps) {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState("");
  const [changes, setChanges] = useState("");
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [amending, setAmending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
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

  const handleAmend = async () => {
    if (!selectedSpecId) {
      setError("Please select a spec to amend.");
      return;
    }
    if (!changes.trim()) {
      setError("Please describe the changes you want to make.");
      return;
    }

    setAmending(true);
    setError(null);
    try {
      // Assuming spec.md is the main file to amend
      const specPath = `specs/${selectedSpecId}/spec.md`;
      const res = await amendSpec(projectId, specPath, changes);
      if (res.success && res.specContent) {
        setResult(res.specContent);
      } else {
        setError(res.error || "Failed to amend spec.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setAmending(false);
    }
  };

  if (result) {
    return (
      <GlassCard className="p-8">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Updated Specification</h2>
        <div className="prose prose-invert max-w-none bg-surface-variant/20 p-6 rounded-lg border border-outline/20 mb-6 max-h-[500px] overflow-y-auto">
          <MarkdownRenderer content={result} />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setResult(null)}
            className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
            onClick={() => alert("Save functionality coming soon!")}
          >
            Apply Changes
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-8">
      <h2 className="text-xl font-semibold text-on-surface mb-2">Amend Existing Spec</h2>
      <p className="text-on-surface-variant mb-6">
        Select a specification and describe the updates or additions you want to make.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            1. Select Specification
          </h3>
          <div className="border border-outline/20 rounded-lg bg-surface-variant/10 h-64 overflow-y-auto p-2">
            {loadingSpecs ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : specs.length > 0 ? (
              <div className="space-y-1">
                {specs.map((spec) => (
                  <label
                    key={spec.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      selectedSpecId === spec.id ? "bg-primary/20 border-primary/30" : "hover:bg-surface-variant/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="spec"
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

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            2. Describe Changes
          </h3>
          <textarea
            value={changes}
            onChange={(e) => setChanges(e.target.value)}
            placeholder="e.g., Add a section for security requirements regarding email validation."
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
          onClick={handleAmend}
          disabled={amending || !selectedSpecId || !changes.trim()}
          className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {amending ? (
            <>
              <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Updating Spec...
            </>
          ) : (
            "Generate Update"
          )}
        </button>
      </div>
    </GlassCard>
  );
}
