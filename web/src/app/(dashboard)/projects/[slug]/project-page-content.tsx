import Link from "next/link";
import { GlassCard } from "@tetrastack/react-glass-components";
import { EnvironmentRow } from "@/components/environment-row";
import type { EnvironmentCR } from "@/types/crd";
import { Task, ASSIGNEES } from "@/components/tasks/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";

// Mock task fixtures - uses actual project slugs: "catalyst" and "meze"
const taskFixtures: Task[] = [
  // catalyst feature tasks
  {
    id: "task-1",
    title: "Implement user authentication flow",
    status: "in_progress",
    priority: "high",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.claude,
    dueDate: "2024-01-15",
    spec: {
      id: "spec-001",
      name: "SPEC-001: Auth System",
      href: "/projects/catalyst/spec/001-auth-system",
    },
    description:
      "Implement complete auth flow including login, logout, session management.",
  },
  {
    id: "task-2",
    title: "Add project creation wizard",
    status: "todo",
    priority: "medium",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.bill,
    dueDate: "2024-01-25",
    spec: {
      id: "spec-009",
      name: "SPEC-009: Projects",
      href: "/projects/catalyst/spec/009-projects",
    },
    description: "Build step-by-step wizard for creating new projects.",
  },
  {
    id: "task-3",
    title: "Build environment deployment UI",
    status: "completed",
    priority: "high",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.copilot,
    dueDate: "2024-01-10",
  },
  // meze feature tasks
  {
    id: "task-4",
    title: "Recipe import from URLs",
    status: "in_progress",
    priority: "high",
    type: "feature",
    project: "meze",
    projectSlug: "meze",
    assignee: ASSIGNEES.claude,
    dueDate: "2024-01-18",
    spec: {
      id: "spec-002",
      name: "SPEC-002: Recipe Import",
      href: "/projects/meze/spec/002-recipe-import",
    },
    description: "Parse and import recipes from popular cooking websites.",
  },
  {
    id: "task-5",
    title: "Meal planning calendar",
    status: "todo",
    priority: "medium",
    type: "feature",
    project: "meze",
    projectSlug: "meze",
    assignee: ASSIGNEES.copilot,
    dueDate: "2024-01-22",
    spec: {
      id: "spec-003",
      name: "SPEC-003: Meal Planning",
      href: "/projects/meze/spec/003-meal-planning",
    },
    description: "Weekly meal planner with drag-and-drop interface.",
  },
  {
    id: "task-6",
    title: "Shopping list generation",
    status: "completed",
    priority: "high",
    type: "feature",
    project: "meze",
    projectSlug: "meze",
    assignee: ASSIGNEES.bill,
    dueDate: "2024-01-08",
    description: "Generate shopping lists from selected recipes.",
  },
];

interface SpecDirectory {
  name: string;
  path: string;
  files: { name: string; type: string }[];
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
}

export function ProjectPageContent({
  project,
  deploymentEnvironments,
  developmentEnvironments,
  specs,
  hasRepo,
}: ProjectPageContentProps) {
  return (
    <>
      {/* Feature Tasks Section */}
      <FeatureTasksSection projectSlug={project.slug} />

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

function FeatureTasksSection({ projectSlug }: { projectSlug: string }) {
  // Filter to feature tasks for this project
  const featureTasks = taskFixtures.filter(
    (task) => task.type === "feature" && task.projectSlug === projectSlug,
  );

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface">Feature Tasks</h2>
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectSlug}#specs`}
            className="text-sm text-primary hover:underline"
          >
            Specs
          </Link>
          <Link
            href={`/tasks/${projectSlug}`}
            className="text-sm text-primary hover:underline"
          >
            View all tasks
          </Link>
        </div>
      </div>

      {featureTasks.length > 0 ? (
        <div className="divide-y divide-outline/50 -mx-6">
          {featureTasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${projectSlug}/${task.id}`}
              className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-surface/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-on-surface font-medium truncate">
                  {task.spec && (
                    <span className="text-primary">
                      {task.spec.href.split("/").pop()}:{" "}
                    </span>
                  )}
                  {task.title}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <PriorityBadge priority={task.priority} size="sm" />
                <StatusBadge status={task.status.replace("_", " ")} size="sm" />
              </div>
            </Link>
          ))}
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="text-on-surface-variant">No feature tasks</p>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            Tasks linked to specs will appear here
          </p>
        </div>
      )}
    </GlassCard>
  );
}
