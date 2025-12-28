"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreateProjectWizard,
  CreateProjectFormData,
} from "./create-project-wizard";
import { createProject } from "./actions";

export function CreateProjectPageClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateProjectFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createProject(data);

      if (result.success && result.project) {
        // Redirect to project home page
        router.push(`/projects/${result.project.slug}`);
      } else {
        setError(result.error || "Failed to create project");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/projects");
  };

  return (
    <>
      {error && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="p-4 bg-error-container text-on-error-container rounded-lg border border-error">
            <p className="font-semibold mb-1">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}
      <CreateProjectWizard
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
