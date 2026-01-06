"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPullRequestAction } from "@/actions/create-pull-request";

export function CreatePullRequestPageClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    repository: "",
    title: "",
    head: "",
    base: "main",
    body: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createPullRequestAction(formData);

      if (result.success && result.prUrl) {
        // Redirect to the created pull request
        window.location.href = result.prUrl;
      } else {
        setError(result.error || "Failed to create pull request");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-on-background mb-2">
          Create New Pull Request
        </h1>
        <p className="text-on-surface-variant">
          Create a new pull request in a GitHub repository.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg border border-error">
          <p className="font-semibold mb-1">Error</p>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="repository"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Repository
          </label>
          <input
            type="text"
            id="repository"
            value={formData.repository}
            onChange={(e) =>
              setFormData({ ...formData, repository: e.target.value })
            }
            placeholder="owner/repo"
            required
            className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-sm text-on-surface-variant">
            Format: owner/repository (e.g., facebook/react)
          </p>
        </div>

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="Pull request title"
            required
            className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="head"
              className="block text-sm font-medium text-on-surface mb-2"
            >
              Source Branch
            </label>
            <input
              type="text"
              id="head"
              value={formData.head}
              onChange={(e) =>
                setFormData({ ...formData, head: e.target.value })
              }
              placeholder="feature-branch"
              required
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="base"
              className="block text-sm font-medium text-on-surface mb-2"
            >
              Target Branch
            </label>
            <input
              type="text"
              id="base"
              value={formData.base}
              onChange={(e) =>
                setFormData({ ...formData, base: e.target.value })
              }
              placeholder="main"
              required
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="body"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Description (optional)
          </label>
          <textarea
            id="body"
            value={formData.body}
            onChange={(e) =>
              setFormData({ ...formData, body: e.target.value })
            }
            placeholder="Describe the changes..."
            rows={8}
            className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Pull Request"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-surface text-on-surface border border-outline rounded-md hover:bg-surface-variant disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
