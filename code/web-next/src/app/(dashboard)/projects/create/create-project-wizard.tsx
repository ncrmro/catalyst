"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RepoSearch } from "@/components/repos/repo-search";
import { checkProjectSlugAvailable } from "@/actions/projects";
import type { ReposData, GitHubRepo } from "@/mocks/github";

// TODO: Add SSH URL support (git@github.com:owner/repo.git)
// Will require:
// - SSH key management UI
// - Server-side SSH key storage
// - Deploy key or user SSH key configuration

export interface CreateProjectFormData {
  name: string;
  slug: string;
  description: string;
  repoUrls: string[];
}

export interface SelectedRepository {
  fullName: string;
  url: string;
  isManual: boolean;
  /** Repo name for auto-fill (e.g., "catalyst") */
  name?: string;
  /** Repo description for auto-fill */
  description?: string;
}

type WizardStep = "repos" | "details";

export interface CreateProjectWizardProps {
  onSubmit?: (data: CreateProjectFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  /** Initial step for testing/storybook */
  initialStep?: WizardStep;
  /** Initial selected repos for testing/storybook */
  initialSelectedRepos?: SelectedRepository[];
  /** Initial GitHub status for testing/storybook - skips fetch if provided */
  initialGitHubStatus?: string; // Kept for prop compatibility but unused internally
  /** Initial repos data for testing/storybook - used when initialGitHubStatus is "connected" */
  initialRepos?: ReposData;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateProjectWizard({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialStep = "repos",
  initialSelectedRepos = [],
}: CreateProjectWizardProps) {
  // Wizard step state
  const [step, setStep] = useState<WizardStep>(initialStep);

  // Multiple repositories state
  const [selectedRepos, setSelectedRepos] =
    useState<SelectedRepository[]>(initialSelectedRepos);

  // Project details state (for step 2)
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // Auto-fill form data when starting on step 2 with pre-selected repos (for Storybook)
  useEffect(() => {
    if (
      initialStep === "details" &&
      initialSelectedRepos.length > 0 &&
      !name &&
      !slug
    ) {
      const firstRepo = initialSelectedRepos[0];
      setName(firstRepo.name || "");
      setSlug(generateSlug(firstRepo.name || ""));
      setDescription(firstRepo.description || "");
    }
  }, [initialStep, initialSelectedRepos, name, slug]);

  // Check slug availability when it changes
  useEffect(() => {
    if (!slug) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const available = await checkProjectSlugAvailable(slug);
        setSlugAvailable(available);
      } catch (error) {
        console.error("Error checking slug availability:", error);
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  // Handle adding a repository from RepoSearch
  const handleRepoSelect = (repo: GitHubRepo) => {
    if (selectedRepos.some((r) => r.url === repo.html_url)) {
      return;
    }

    setSelectedRepos((prev) => [
      ...prev,
      {
        fullName: repo.full_name,
        url: repo.html_url,
        isManual: false,
        name: repo.name,
        description: repo.description || undefined,
      },
    ]);
  };

  // Handle removing a repository
  const handleRemoveRepo = (url: string) => {
    setSelectedRepos((prev) => prev.filter((r) => r.url !== url));
  };

  // Handle continuing to step 2 - auto-fill from first repo
  const handleContinue = () => {
    if (selectedRepos.length > 0) {
      const firstRepo = selectedRepos[0];
      setName(firstRepo.name || "");
      setSlug(generateSlug(firstRepo.name || ""));
      setDescription(firstRepo.description || "");
      // TODO: AI-generated project description when:
      // - Multiple repos added (combine repo descriptions?)
      // - Single repo with no description
      // - User requests regeneration
    }
    setStep("details");
  };

  // Handle going back to step 1
  const handleBack = () => {
    setStep("repos");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({
      name,
      slug,
      description,
      repoUrls: selectedRepos.map((r) => r.url),
    });
  };

  // Step 1: Repository Selection
  if (step === "repos") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Card className="mb-6 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary text-sm font-medium">
              1
            </div>
            <h1 className="text-3xl font-bold text-on-background">
              Select Repositories
            </h1>
          </div>
          <p className="text-on-surface-variant ml-11">
            Choose the repositories to include in this project. You can add
            multiple repositories.
          </p>
        </Card>

        <Card className="mb-6 p-6">
          <div className="space-y-6">
            {/* Selected repositories list */}
            {selectedRepos.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-on-surface">
                    Selected Repositories
                  </label>
                  <span className="text-xs text-on-surface-variant">
                    {selectedRepos.length} added
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedRepos.map((repo) => (
                    <div
                      key={repo.url}
                      className="flex items-center justify-between px-3 py-2 bg-surface-variant/30 border border-outline/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg
                          className="w-4 h-4 text-on-surface-variant flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {repo.isManual ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                          )}
                        </svg>
                        <span className="text-sm text-on-surface truncate">
                          {repo.fullName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRepo(repo.url)}
                        className="p-1 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors flex-shrink-0"
                        aria-label="Remove repository"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repository selector */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">
                Add Repository
              </label>
              <RepoSearch
                onSelect={handleRepoSelect}
                excludeUrls={selectedRepos.map((r) => r.url)}
                placeholder="Search repositories to add..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-outline/30">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={selectedRepos.length === 0}
                className={cn(
                  "px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-md transition-opacity flex items-center gap-2",
                  selectedRepos.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90",
                )}
              >
                Continue
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Step 2: Project Details
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Card className="mb-6 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary text-sm font-medium">
            2
          </div>
          <h1 className="text-3xl font-bold text-on-background">
            Project Details
          </h1>
        </div>
        <p className="text-on-surface-variant ml-11">
          Configure your project name and description. These can be changed
          later.
        </p>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6 p-6">
          <div className="space-y-6">
            {/* Selected repos summary (read-only) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-on-surface">
                  Repositories
                </label>
                <span className="text-xs text-on-surface-variant">
                  {selectedRepos.length} selected
                </span>
              </div>
              <div className="space-y-1">
                {selectedRepos.map((repo) => (
                  <div
                    key={repo.url}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface-variant/20 rounded text-sm text-on-surface-variant"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {repo.isManual ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      )}
                    </svg>
                    <span className="truncate">{repo.fullName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Project Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Project"
                required
                className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="mt-1 text-xs text-on-surface-variant">
                A display name for your project
              </p>
            </div>

            {/* Project Slug */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Project Slug <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-awesome-project"
                required
                pattern="[a-z0-9\-]+"
                className={cn(
                  "w-full px-3 py-2 border rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:border-transparent font-mono text-sm",
                  slugAvailable === false
                    ? "border-error focus:ring-error"
                    : "border-outline/50 focus:ring-primary",
                )}
              />
              {isCheckingSlug && (
                <p className="mt-1 text-[10px] text-on-surface-variant">
                  Checking availability...
                </p>
              )}
              {slugAvailable === false && (
                <p className="mt-1 text-[10px] text-error">
                  This slug is already taken by another project in your team.
                </p>
              )}
              <p className="mt-1 text-xs text-on-surface-variant">
                Used in URLs and Kubernetes resources (lowercase, hyphens only)
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project..."
                rows={3}
                className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
              {/* TODO: AI-generated project description when:
                  - Multiple repos added (combine repo descriptions?)
                  - Single repo with no description
                  - User requests regeneration */}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-outline/30">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting || !name || !slug || slugAvailable === false
                }
                className={cn(
                  "px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-md transition-opacity",
                  isSubmitting || !name || !slug || slugAvailable === false
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90",
                )}
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
