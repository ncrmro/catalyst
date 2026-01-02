"use client";

import { useState } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";
import { generateSpecFromDescription } from "@/actions/spec-workflow";
import { MarkdownRenderer } from "@tetrastack/react-markdown";

interface NewSpecPanelProps {
  projectId: string;
}

export function NewSpecPanel({ projectId }: NewSpecPanelProps) {
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please provide a description of the feature.");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await generateSpecFromDescription(projectId, description);
      if (res.success && res.specContent) {
        setResult(res.specContent);
      } else {
        setError(res.error || "Failed to generate spec.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setGenerating(false);
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
            Back
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
      <h2 className="text-xl font-semibold text-on-surface mb-2">Create New Spec</h2>
      <p className="text-on-surface-variant mb-6">
        Describe the feature you want to specify, and AI will generate a draft for you.
      </p>

      <div className="space-y-4 mb-8">
        <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide">
          Feature Description
        </h3>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., A system for users to invite teammates via email with role-based permissions."
          className="w-full h-64 p-4 rounded-lg bg-surface-variant/20 border border-outline/30 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none text-sm"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={generating || !description.trim()}
          className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Generating Spec...
            </>
          ) : (
            "Generate Spec"
          )}
        </button>
      </div>
    </GlassCard>
  );
}
