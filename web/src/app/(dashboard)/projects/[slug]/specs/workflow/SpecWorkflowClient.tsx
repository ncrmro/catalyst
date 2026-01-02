"use client";

import { useState } from "react";
import {
  SpecWorkflowLayout,
  WorkflowStep,
} from "@/components/specs/workflow/SpecWorkflowLayout";
import { GlassCard } from "@tetrastack/react-glass-components";
import { BootstrapSpecsPanel } from "@/components/specs/workflow/BootstrapSpecsPanel";
import { DistillSpecPanel } from "@/components/specs/workflow/DistillSpecPanel";
import { NewSpecPanel } from "@/components/specs/workflow/NewSpecPanel";
import { AmendSpecPanel } from "@/components/specs/workflow/AmendSpecPanel";
import { CodeAnnotationsPanel } from "@/components/specs/workflow/CodeAnnotationsPanel";

interface SpecWorkflowClientProps {
  projectId: string;
  projectSlug: string;
  repoFullName?: string;
}

export function SpecWorkflowClient({
  projectId,
  projectSlug,
  repoFullName,
}: SpecWorkflowClientProps) {
  const [activeStep, setActiveStep] = useState<WorkflowStep>("bootstrap");
  const [createMode, setCreateMode] = useState<"choose" | "new" | "amend">("choose");

  return (
    <SpecWorkflowLayout activeStep={activeStep} onStepChange={(step) => {
      setActiveStep(step);
      if (step === "create") setCreateMode("choose");
    }}>
      {activeStep === "bootstrap" && (
        <BootstrapSpecsPanel projectId={projectId} />
      )}

      {activeStep === "distill" && (
        <DistillSpecPanel projectId={projectId} repoFullName={repoFullName} />
      )}

      {activeStep === "create" && (
        <>
          {createMode === "choose" && (
            <GlassCard className="min-h-[400px] flex items-center justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 w-full max-w-2xl">
                <button
                  onClick={() => setCreateMode("new")}
                  className="p-8 rounded-xl bg-surface-variant/20 border border-outline/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group"
                >
                  <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-on-surface mb-2">New Specification</h3>
                  <p className="text-sm text-on-surface-variant">Create a draft from a feature description.</p>
                </button>

                <button
                  onClick={() => setCreateMode("amend")}
                  className="p-8 rounded-xl bg-surface-variant/20 border border-outline/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-center group"
                >
                  <div className="w-12 h-12 bg-secondary/20 text-secondary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-on-surface mb-2">Amend Existing</h3>
                  <p className="text-sm text-on-surface-variant">Update an existing spec with new requirements.</p>
                </button>
              </div>
            </GlassCard>
          )}
          {createMode === "new" && <NewSpecPanel projectId={projectId} />}
          {createMode === "amend" && <AmendSpecPanel projectId={projectId} projectSlug={projectSlug} />}
        </>
      )}

      {activeStep === "annotate" && (
        <CodeAnnotationsPanel projectId={projectId} projectSlug={projectSlug} />
      )}
    </SpecWorkflowLayout>
  );
}
