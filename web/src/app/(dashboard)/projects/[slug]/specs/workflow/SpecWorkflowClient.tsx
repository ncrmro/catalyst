"use client";

import { useState } from "react";
import {
  SpecWorkflowLayout,
  WorkflowStep,
} from "@/components/specs/workflow/SpecWorkflowLayout";
import { GlassCard } from "@tetrastack/react-glass-components";
import { BootstrapSpecsPanel } from "@/components/specs/workflow/BootstrapSpecsPanel";
import { DistillSpecPanel } from "@/components/specs/workflow/DistillSpecPanel";

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

  return (
    <SpecWorkflowLayout activeStep={activeStep} onStepChange={setActiveStep}>
      {activeStep === "bootstrap" && (
        <BootstrapSpecsPanel projectId={projectId} />
      )}

      {activeStep === "distill" && (
        <DistillSpecPanel projectId={projectId} repoFullName={repoFullName} />
      )}

      {activeStep === "create" && (
        <GlassCard className="min-h-[400px] flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-on-surface mb-2">
              Create / Amend Spec
            </h2>
            <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
              Create a new specification from scratch or modify an existing one
              using AI assistance.
            </p>
            <button className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors">
              New Spec
            </button>
          </div>
        </GlassCard>
      )}

      {activeStep === "annotate" && (
        <GlassCard className="min-h-[400px] flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold text-on-surface mb-2">
              Code Annotations
            </h2>
            <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
              Scan your codebase to identify implemented functional requirements
              and add mapping comments.
            </p>
            <button className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors">
              Scan Code
            </button>
          </div>
        </GlassCard>
      )}
    </SpecWorkflowLayout>
  );
}
