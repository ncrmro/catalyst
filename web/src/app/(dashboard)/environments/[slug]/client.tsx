"use client";

import { useState } from "react";
import type { ProjectWithRelations } from "@/types/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/** Result type for environment configuration actions */
export interface EnvironmentResult {
  success: boolean;
  message: string;
  environmentId?: string;
  environmentType?: string;
  projectId?: string;
}

export interface EnvironmentsFormProps {
  project: ProjectWithRelations;
  /** Action callback for form submission - passed from server component */
  onSubmit: (formData: FormData) => Promise<EnvironmentResult>;
}

// Client component to handle form submission and feedback
export function EnvironmentsForm({ project, onSubmit }: EnvironmentsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEnvType, setSelectedEnvType] = useState<
    "deployment" | "development"
  >("development");
  const [deploymentSubType, setDeploymentSubType] = useState<
    "production" | "staging"
  >("production");

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Add deploymentSubType to formData if deployment is selected
      if (selectedEnvType === "deployment") {
        formData.append("deploymentSubType", deploymentSubType);
      }

      // Submit through the action callback passed from parent
      const result = await onSubmit(formData);

      if (result.success) {
        // Redirect back to project page on success
        router.push(`/projects/${project.slug}`);
        router.refresh(); // Ensure the project page shows the new environment
      } else {
        setError(result.message);
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to configure environment",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projects/${project.slug}`}
          className="inline-flex items-center text-primary hover:opacity-80 mb-4"
        >
          ← Back to {project.name}
        </Link>
        <h1 className="text-3xl font-bold text-on-background mb-4">
          Configure Environments
        </h1>
        <p className="text-lg text-on-surface-variant mb-6">
          Set up deployment environments for{" "}
          <span className="font-semibold">{project.fullName}</span>. We
          recommend starting with a preview environment which will create pull
          requests for your changes.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg border border-error">
          <p className="font-semibold mb-1">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Environment Configuration Form */}
      <div className="bg-surface border border-outline rounded-lg p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-on-surface mb-6">
          Choose Your First Environment
        </h2>

        {/* Getting Started Tip */}
        <div className="mb-8 bg-primary-container/10 border border-primary rounded-lg p-6">
          <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <span>Getting Started</span>
          </h3>
          <p className="text-on-surface-variant text-sm">
            New to the platform? Start with a{" "}
            <strong>Development Environment</strong> to experiment safely.
            Deployment environments (Production/Staging) involve ACLs, approval
            workflows, and release processes—best configured after testing your
            workflow.
          </p>
        </div>

        <form action={handleSubmit}>
          <input type="hidden" name="projectId" value={project.id} />

          <div className="space-y-4 mb-8">
            {/* Development Environment Option */}
            <div
              onClick={() => setSelectedEnvType("development")}
              className={cn(
                "border rounded-lg p-6 cursor-pointer transition-all",
                selectedEnvType === "development"
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-outline/50 hover:border-outline hover:bg-surface/50",
              )}
            >
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="environmentType"
                  value="development"
                  checked={selectedEnvType === "development"}
                  onChange={() => setSelectedEnvType("development")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-on-surface">
                      Development Environments
                    </h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-success-container text-on-success-container">
                      ✓ Recommended
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-3">
                    Creates isolated environments for development, testing, and
                    experimentation. Ideal for trying changes without affecting
                    production systems.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs rounded bg-surface-variant/30 text-on-surface-variant">
                      🎲 Random Name
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-surface-variant/30 text-on-surface-variant">
                      🚀 Instant Setup
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-surface-variant/30 text-on-surface-variant">
                      🔓 No Approvals
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deployment Environment Option */}
            <div
              onClick={() => setSelectedEnvType("deployment")}
              className={cn(
                "border rounded-lg p-6 cursor-pointer transition-all",
                selectedEnvType === "deployment"
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-outline/50 hover:border-outline hover:bg-surface/50",
              )}
            >
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="environmentType"
                  value="deployment"
                  checked={selectedEnvType === "deployment"}
                  onChange={() => setSelectedEnvType("deployment")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-on-surface mb-2">
                    Deployment Environments
                  </h3>
                  <p className="text-sm text-on-surface-variant mb-3">
                    Production and staging environments with controlled access,
                    approval workflows, and release processes. These
                    environments enforce ACLs, require team approvals, and
                    follow strict deployment procedures.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs rounded bg-surface-variant/30 text-on-surface-variant">
                      🔒 Access Controls
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-surface-variant/30 text-on-surface-variant">
                      ✅ Approval Required
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-surface-variant/30 text-on-surface-variant">
                      📋 Release Process
                    </span>
                  </div>

                  {/* Sub-selection: Production vs Staging */}
                  {selectedEnvType === "deployment" && (
                    <div className="mt-4 pl-6 border-l-2 border-primary/30 space-y-3">
                      <p className="text-xs font-medium text-on-surface-variant mb-2">
                        Select deployment type:
                      </p>

                      {/* Production Sub-option */}
                      <label
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                          deploymentSubType === "production"
                            ? "bg-primary/10"
                            : "hover:bg-surface/50",
                        )}
                      >
                        <input
                          type="radio"
                          name="deploymentSubType"
                          value="production"
                          checked={deploymentSubType === "production"}
                          onChange={() => setDeploymentSubType("production")}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-on-surface">
                              Production
                            </span>
                            <span className="px-1.5 py-0.5 text-xs rounded bg-error-container/20 text-error">
                              Live Traffic
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1">
                            Customer-facing environment with strictest controls,
                            monitoring, and team approvals
                          </p>
                        </div>
                      </label>

                      {/* Staging Sub-option */}
                      <label
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                          deploymentSubType === "staging"
                            ? "bg-primary/10"
                            : "hover:bg-surface/50",
                        )}
                      >
                        <input
                          type="radio"
                          name="deploymentSubType"
                          value="staging"
                          checked={deploymentSubType === "staging"}
                          onChange={() => setDeploymentSubType("staging")}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-on-surface">
                              Staging
                            </span>
                            <span className="px-1.5 py-0.5 text-xs rounded bg-secondary-container/50 text-on-secondary-container">
                              Pre-Production
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1">
                            QA testing and stakeholder review with
                            production-like setup and test data
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-6 border-t border-outline">
            <Link
              href={`/projects/${project.slug}`}
              className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container hover:text-on-secondary-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 text-sm font-medium text-on-primary bg-primary border border-transparent rounded-md ${
                isSubmitting
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:opacity-90"
              } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
            >
              {isSubmitting ? "Configuring..." : "Configure Environment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
