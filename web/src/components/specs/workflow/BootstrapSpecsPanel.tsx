"use client";

import { useState } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";
import { analyzeRepoForSpecs, bootstrapSpecs, type SpecAnalysisProposal } from "@/actions/spec-workflow";

interface BootstrapSpecsPanelProps {
  projectId: string;
}

export function BootstrapSpecsPanel({ projectId }: BootstrapSpecsPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [proposal, setProposal] = useState<SpecAnalysisProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successPrUrl, setSuccessPrUrl] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeRepoForSpecs(projectId);
      setProposal(result);
    } catch (err) {
      setError("Failed to analyze repository. Make sure the backend is reachable.");
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    setError(null);
    try {
      const result = await bootstrapSpecs(projectId);
      if (result.success && result.prUrl) {
        setSuccessPrUrl(result.prUrl);
      } else {
        setError(result.error || "Failed to bootstrap specs.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setBootstrapping(false);
    }
  };

  if (successPrUrl) {
    return (
      <GlassCard className="min-h-[400px] flex items-center justify-center bg-green-500/5 border-green-500/20">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-on-surface mb-2">Success!</h2>
          <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
            The pull request to bootstrap specs has been created.
          </p>
          <a
            href={successPrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            View Pull Request
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </GlassCard>
    );
  }

  if (proposal) {
    return (
      <GlassCard className="p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-on-surface mb-2">Analysis Result</h2>
          <p className="text-sm text-on-surface-variant">
            Project Type: <span className="font-medium text-on-surface">{proposal.projectType}</span>
          </p>
          {proposal.existingSpecs && (
            <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
              Note: A specs directory already exists. Bootstrapping will overwrite existing templates if they conflict.
            </div>
          )}
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
            Proposed Files
          </h3>
          <div className="space-y-2">
            {proposal.proposedFiles.map((file) => (
              <div key={file.path} className="flex items-center justify-between p-3 bg-surface-variant/30 rounded-lg border border-outline/20">
                <code className="text-sm font-mono text-primary">{file.path}</code>
                <span className="text-sm text-on-surface-variant">{file.description}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setProposal(null)}
            className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors"
            disabled={bootstrapping}
          >
            Cancel
          </button>
          <button
            onClick={handleBootstrap}
            disabled={bootstrapping}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {bootstrapping ? (
              <>
                <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Creating PR...
              </>
            ) : (
              "Create Pull Request"
            )}
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="min-h-[400px] flex items-center justify-center">
      <div className="text-center p-8">
        <h2 className="text-xl font-semibold text-on-surface mb-2">
          Bootstrap Specs
        </h2>
        <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
          Analyze your repository structure to generate an initial AGENTS.md
          and set up standard spec templates.
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
        >
          {analyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Analyzing Repo...
            </>
          ) : (
            "Start Analysis"
          )}
        </button>
      </div>
    </GlassCard>
  );
}
