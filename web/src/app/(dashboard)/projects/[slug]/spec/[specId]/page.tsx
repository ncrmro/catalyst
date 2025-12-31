import { listDirectory, readFile } from "@/actions/version-control-provider";
import { fetchProjectBySlug } from "@/actions/projects";
import { GlassCard } from "@tetrastack/react-glass-components";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { MarkdownRenderer } from "@tetrastack/react-markdown";

interface SpecPageProps {
  params: Promise<{
    slug: string;
    specId: string;
  }>;
  searchParams: Promise<{
    file?: string;
  }>;
}

export async function generateMetadata({
  params,
}: SpecPageProps): Promise<Metadata> {
  const { slug, specId } = await params;
  const project = await fetchProjectBySlug(slug);

  return {
    title: project
      ? `${specId} - ${project.fullName} - Catalyst`
      : "Spec - Catalyst",
    description: `Specification document for ${specId}`,
  };
}

export default async function SpecPage({
  params,
  searchParams,
}: SpecPageProps) {
  const { slug, specId } = await params;
  const { file: selectedFile } = await searchParams;

  // Default to spec.md if no file specified
  const fileName = selectedFile || "spec.md";

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const repo = project.repositories[0]?.repo;
  if (!repo) {
    notFound();
  }

  // Fetch spec file content and the spec directory files
  const [fileResult, specDirResult] = await Promise.all([
    readFile(repo.fullName, `specs/${specId}/${fileName}`),
    listDirectory(repo.fullName, `specs/${specId}`),
  ]);

  const specContent = fileResult.success ? fileResult.file : null;
  const specFiles = specDirResult.success ? specDirResult.entries : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar with spec files */}
      <div className="lg:col-span-1">
        <GlassCard>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">
            Spec Files
          </h3>
          {specFiles.length > 0 ? (
            <nav className="space-y-1">
              {specFiles
                .filter((file) => file.name.endsWith(".md"))
                .map((file) => {
                  const isActive = file.name === fileName;
                  return (
                    <Link
                      key={file.path}
                      href={`/projects/${slug}/spec/${specId}?file=${file.name}`}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {file.name}
                    </Link>
                  );
                })}
            </nav>
          ) : (
            <p className="text-sm text-on-surface-variant">No files found</p>
          )}

          {/* Back to project link */}
          <div className="mt-6 pt-4 border-t border-outline/30">
            <Link
              href={`/projects/${slug}`}
              className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
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
              Back to project
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Main content */}
      <div className="lg:col-span-3">
        <GlassCard>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline/30">
            <div>
              <h1 className="text-xl font-bold text-on-surface">{specId}</h1>
              <p className="text-sm text-on-surface-variant mt-1">
                {project.fullName}
              </p>
            </div>
            {specContent?.htmlUrl && (
              <a
                href={specContent.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface bg-surface-variant hover:bg-surface-variant/80 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </a>
            )}
          </div>

          {/* Spec Content */}
          {specContent ? (
            <MarkdownRenderer content={specContent.content} />
          ) : (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-4"
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
              <h3 className="text-lg font-medium text-on-surface mb-2">
                Spec not found
              </h3>
              <p className="text-on-surface-variant">
                The spec.md file could not be loaded from the repository.
              </p>
              <p className="text-sm text-on-surface-variant/70 mt-2">
                Make sure the file exists at{" "}
                <code className="bg-surface-variant px-1.5 py-0.5 rounded">
                  specs/{specId}/spec.md
                </code>
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
