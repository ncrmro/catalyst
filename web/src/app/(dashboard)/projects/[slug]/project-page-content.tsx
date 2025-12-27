import Link from "next/link";
import { GlassCard } from "@tetrastack/react-glass-components";
import { EnvironmentRow } from "@/components/environment-row";
import type { EnvironmentCR } from "@/types/crd";

interface SpecDirectory {
  name: string;
  path: string;
  files: { name: string; type: string }[];
}

interface GettingStartedTask {
  id: string;
  title: string;
  description: string;
  href: string;
  isComplete: boolean;
  icon: "environment" | "spec" | "repo";
}

interface ProjectPageContentProps {
  project: {
    slug: string;
    name: string;
    fullName: string;
  };
  deploymentEnvironments: EnvironmentCR[];
  developmentEnvironments: EnvironmentCR[];
  specs: SpecDirectory[];
  hasRepo: boolean;
  isNewProject?: boolean;
}

function TaskIcon({ type }: { type: "environment" | "spec" | "repo" }) {
  if (type === "environment") {
    return (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
        />
      </svg>
    );
  }
  if (type === "spec") {
    return (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

export function ProjectPageContent({
  project,
  deploymentEnvironments,
  developmentEnvironments,
  specs,
  hasRepo,
}: ProjectPageContentProps) {
  const hasEnvironments =
    deploymentEnvironments.length > 0 || developmentEnvironments.length > 0;
  const hasSpecs = specs && specs.length > 0;

  // Show getting started if project has no environments and no specs
  const showGettingStarted = !hasEnvironments || !hasSpecs;

  const gettingStartedTasks: GettingStartedTask[] = [
    {
      id: "environments",
      title: "Set up deployment environments",
      description:
        "Configure staging and production environments for your project",
      href: `/environments/${project.slug}`,
      isComplete: hasEnvironments,
      icon: "environment",
    },
    {
      id: "specs",
      title: "Define or locate specs",
      description: hasRepo
        ? "Add a specs/ directory to your repository with feature specifications"
        : "Link a repository first, then add specs to track work",
      href: hasRepo
        ? `/projects/${project.slug}/repo`
        : `/projects/${project.slug}/repo`,
      isComplete: hasSpecs,
      icon: "spec",
    },
  ];

  const completedCount = gettingStartedTasks.filter((t) => t.isComplete).length;
  const allComplete = completedCount === gettingStartedTasks.length;

  return (
    <>
      {/* Getting Started Banner */}
      {showGettingStarted && !allComplete && (
        <GlassCard>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-on-surface">
                  Get started with {project.name}
                </h2>
                <span className="text-sm text-on-surface-variant">
                  {completedCount} of {gettingStartedTasks.length} complete
                </span>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">
                Complete these tasks to set up your project for development and
                deployment.
              </p>
              <div className="space-y-3">
                {gettingStartedTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={task.href}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      task.isComplete
                        ? "bg-success-container/30 border-success/30 hover:bg-success-container/50"
                        : "bg-surface-container border-outline-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        task.isComplete
                          ? "bg-success text-on-success"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {task.isComplete ? (
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <TaskIcon type={task.icon} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-medium ${task.isComplete ? "text-on-success-container line-through" : "text-on-surface"}`}
                      >
                        {task.title}
                      </h3>
                      <p
                        className={`text-sm ${task.isComplete ? "text-on-success-container/70" : "text-on-surface-variant"}`}
                      >
                        {task.description}
                      </p>
                    </div>
                    {!task.isComplete && (
                      <svg
                        className="w-4 h-4 text-on-surface-variant flex-shrink-0"
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
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Environments Section */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-on-surface">
            Environments
          </h2>
          <Link
            href={`/environments/${project.slug}`}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
          >
            Add Environment
          </Link>
        </div>

        {/* Deployment Environments */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-on-surface-variant mb-2 px-0">
            Deployment Environments
          </h3>
          <div className="divide-y divide-outline/50 -mx-6">
            {deploymentEnvironments.length > 0 ? (
              deploymentEnvironments.map((env) => (
                <EnvironmentRow
                  key={env.metadata.name}
                  environment={env}
                  projectSlug={project.slug}
                />
              ))
            ) : (
              <div className="px-6 py-4 text-center text-on-surface-variant text-sm">
                No deployment environments
              </div>
            )}
          </div>
        </div>

        {/* Development Environments */}
        <div>
          <h3 className="text-sm font-medium text-on-surface-variant mb-2 px-0">
            Development Environments
          </h3>
          <div className="divide-y divide-outline/50 -mx-6">
            {developmentEnvironments.length > 0 ? (
              developmentEnvironments.map((env) => (
                <EnvironmentRow
                  key={env.metadata.name}
                  environment={env}
                  projectSlug={project.slug}
                />
              ))
            ) : (
              <div className="px-6 py-4 text-center text-on-surface-variant text-sm">
                No development environments
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Specs Section */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-on-surface">Specs</h2>
          <span className="text-sm text-on-surface-variant">
            {specs?.length ?? 0} specifications
          </span>
        </div>
        {!hasRepo ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <p className="text-on-surface-variant">No repository linked</p>
            <p className="text-sm text-on-surface-variant/70 mt-1">
              Link a repository to this project to view specs
            </p>
          </div>
        ) : specs && specs.length > 0 ? (
          <div className="divide-y divide-outline/50 -mx-6">
            {specs.map((spec) => {
              const hasSpecFile = spec.files.some((f) => f.name === "spec.md");
              const fileCount = spec.files.filter((f) =>
                f.name.endsWith(".md"),
              ).length;

              return (
                <Link
                  key={spec.path}
                  href={`/projects/${project.slug}/spec/${spec.name}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-surface/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-on-surface">{spec.name}</h3>
                    <p className="text-sm text-on-surface-variant">
                      {fileCount} markdown {fileCount === 1 ? "file" : "files"}
                    </p>
                  </div>
                  {hasSpecFile ? (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-secondary-container text-on-secondary-container">
                      has spec
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-surface-variant text-on-surface-variant">
                      no spec.md
                    </span>
                  )}
                  <svg
                    className="w-4 h-4 text-on-surface-variant flex-shrink-0"
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
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-on-surface-variant">No specs found</p>
            <p className="text-sm text-on-surface-variant/70 mt-1">
              Add a{" "}
              <code className="bg-surface-variant px-1.5 py-0.5 rounded">
                specs/
              </code>{" "}
              directory to your repository
            </p>
          </div>
        )}
      </GlassCard>
    </>
  );
}
