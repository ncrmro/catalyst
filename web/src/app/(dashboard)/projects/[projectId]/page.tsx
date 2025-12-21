import { fetchProjectById } from "@/actions/projects";
import { listSpecs } from "@/actions/specs";
import { GlassCard } from "@tetrastack/react-glass-components";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { EnvironmentsSection } from "./environments-section";

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await fetchProjectById(projectId);

  return {
    title: project ? `${project.fullName} - Catalyst` : "Project - Catalyst",
    description: project?.description || "Project overview and environments.",
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  const [project, specs] = await Promise.all([
    fetchProjectById(projectId),
    listSpecs(projectId),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <>
      <EnvironmentsSection projectId={projectId} />

      {/* Specs Section */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-on-surface">Specs</h2>
          <span className="text-sm text-on-surface-variant">
            {specs?.length ?? 0} specifications
          </span>
        </div>
        {specs && specs.length > 0 ? (
          <div className="divide-y divide-outline/50 -mx-6">
            {specs.map((spec) => {
              // Check if spec.md exists in the spec directory
              const hasSpecFile = spec.files.some((f) => f.name === "spec.md");
              const fileCount = spec.files.filter((f) =>
                f.name.endsWith(".md"),
              ).length;

              return (
                <Link
                  key={spec.path}
                  href={`/projects/${projectId}/spec/${spec.name}`}
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
