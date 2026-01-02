"use client";

import { ReactNode } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";

export type WorkflowStep = "bootstrap" | "distill" | "create" | "annotate";

interface SpecWorkflowLayoutProps {
  activeStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
  children: ReactNode;
}

export function SpecWorkflowLayout({
  activeStep,
  onStepChange,
  children,
}: SpecWorkflowLayoutProps) {
  const steps: { id: WorkflowStep; label: string }[] = [
    { id: "bootstrap", label: "1. Bootstrap Specs" },
    { id: "distill", label: "2. Distill Spec from Code" },
    { id: "create", label: "3. Create / Amend Spec" },
    { id: "annotate", label: "4. Code Annotations" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Workflow Steps / Navigation */}
      <div className="lg:col-span-1 space-y-4">
        <GlassCard className="p-4">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">
            Workflow
          </h3>
          <nav className="space-y-2">
            {steps.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => onStepChange(step.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
                  }`}
                >
                  {step.label}
                </button>
              );
            })}
          </nav>
        </GlassCard>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-2">{children}</div>
    </div>
  );
}
