"use client";

import { useState } from "react";
import { ProjectWithRelations } from "@/models/projects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { configureProjectEnvironments } from "@/actions/environments";

interface EnvironmentsPageClientProps {
  project: ProjectWithRelations;
}

// Client component to handle form submission and feedback
export function EnvironmentsForm({ project }: EnvironmentsPageClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Submit directly through the server action
      // We handle redirection here in the client
      const result = await configureProjectEnvironments(formData);

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

        <form action={handleSubmit}>
          <input type="hidden" name="projectId" value={project.id} />

          <div className="space-y-4 mb-8">
            {/* Development Environment */}
            <label className="flex items-start gap-4 p-6 border-2 border-primary rounded-lg cursor-pointer bg-primary-container/20 hover:bg-primary-container/30 transition-colors">
              <input
                type="radio"
                name="environmentType"
                value="development"
                defaultChecked
                className="mt-2 w-4 h-4 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-semibold text-on-surface text-lg mb-2">
                  Development Environment
                </div>
                <div className="text-on-surface-variant text-sm mb-3">
                  Creates a unique, randomly named environment for development
                  and testing. Ideal for experimenting with changes in isolation
                  without affecting others.
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-success-container text-on-success-container px-2 py-1 rounded-full">
                    ✓ Recommended
                  </span>
                  <span className="bg-primary-container text-on-primary-container px-2 py-1 rounded-full">
                    🎲 Random Name
                  </span>
                  <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full">
                    🚀 Instant Setup
                  </span>
                </div>
              </div>
            </label>

            {/* Production Environment */}
            <label className="flex items-start gap-4 p-6 border border-outline rounded-lg cursor-pointer hover:bg-secondary-container/20 transition-colors">
              <input
                type="radio"
                name="environmentType"
                value="production"
                className="mt-2 w-4 h-4 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-semibold text-on-surface text-lg mb-2">
                  Production Environment
                </div>
                <div className="text-on-surface-variant text-sm mb-3">
                  Your live, customer-facing environment. Deployments are
                  triggered manually or through automated releases when code is
                  merged to your main branch. This environment should be
                  configured after you have tested your deployment process with
                  preview environments.
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-warning-container text-on-warning-container px-2 py-1 rounded-full">
                    ⚠️ Set up later
                  </span>
                  <span className="bg-error-container text-on-error-container px-2 py-1 rounded-full">
                    🔒 Manual Deploy
                  </span>
                  <span className="bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded-full">
                    📈 Live Traffic
                  </span>
                </div>
              </div>
            </label>

            {/* Staging Environment */}
            <label className="flex items-start gap-4 p-6 border border-outline rounded-lg cursor-pointer hover:bg-tertiary-container/20 transition-colors">
              <input
                type="radio"
                name="environmentType"
                value="staging"
                className="mt-2 w-4 h-4 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-semibold text-on-surface text-lg mb-2">
                  Staging Environment
                </div>
                <div className="text-on-surface-variant text-sm mb-3">
                  A production-like environment for final testing before
                  release. Ideal for QA testing, performance validation, and
                  stakeholder reviews. Typically mirrors your production setup
                  but with test data and may have different scaling
                  configurations.
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full">
                    🧪 QA Testing
                  </span>
                  <span className="bg-tertiary-container text-on-tertiary-container px-2 py-1 rounded-full">
                    📊 Performance Testing
                  </span>
                  <span className="bg-warning-container text-on-warning-container px-2 py-1 rounded-full">
                    👥 Stakeholder Review
                  </span>
                </div>
              </div>
            </label>
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

      {/* Additional Information */}
      <div className="mt-8 bg-secondary-container/10 border border-secondary rounded-lg p-6">
        <h3 className="font-semibold text-on-surface mb-3">
          💡 Getting Started Tip
        </h3>
        <p className="text-on-surface-variant text-sm">
          We strongly recommend starting with a{" "}
          <strong>Development Environment</strong>. This will help you
          understand the deployment process and ensure your application works
          correctly before setting up production environments. You can always
          add more environments later.
        </p>
      </div>
    </div>
  );
}
