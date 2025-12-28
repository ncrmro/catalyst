import { fetchProjectBySlug, getPullRequest } from "@/actions/projects";
import { getCIStatus } from "@/actions/ci-checks";
import { GlassCard } from "@tetrastack/react-glass-components";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { CIStatusBadge } from "@/components/ci/CIStatusBadge";
import { CIChecksList } from "@/components/ci/CIChecksList";
import { MarkdownRenderer } from "@tetrastack/react-markdown";

interface PRPageProps {
  params: Promise<{
    slug: string;
    number: string;
  }>;
}

export async function generateMetadata({
  params,
}: PRPageProps): Promise<Metadata> {
  const { slug, number } = await params;
  const project = await fetchProjectBySlug(slug);
  const prNumber = parseInt(number, 10);

  if (!project || isNaN(prNumber)) {
    return {
      title: "Pull Request - Catalyst",
    };
  }

  const pr = await getPullRequest(project.id, prNumber);

  return {
    title: pr
      ? `PR #${pr.number}: ${pr.title} - ${project.fullName} - Catalyst`
      : `PR #${prNumber} - ${project.fullName} - Catalyst`,
    description: pr?.title || "Pull request details",
  };
}

export default async function PRPage({ params }: PRPageProps) {
  const { slug, number } = await params;
  const prNumber = parseInt(number, 10);

  if (isNaN(prNumber)) {
    notFound();
  }

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const pr = await getPullRequest(project.id, prNumber);

  if (!pr) {
    notFound();
  }

  // Fetch CI status
  const ciStatus = await getCIStatus(project.id, prNumber);

  return (
    <div className="space-y-6">
      <GlassCard>
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={`/projects/${slug}/work`}
                className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
              >
                ← Back to Work Items
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-on-surface">
              #{pr.number}: {pr.title}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {project.fullName} • {pr.repository}
            </p>
          </div>
          <a
            href={pr.url}
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
        </div>

        {/* PR Attributes */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-6">
          {/* Status */}
          <div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              Status
            </h3>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                pr.status === "draft"
                  ? "bg-surface-variant text-on-surface-variant"
                  : pr.status === "changes_requested"
                    ? "bg-error/10 text-error"
                    : "bg-success/10 text-success"
              }`}
            >
              {pr.status === "draft" && "Draft"}
              {pr.status === "changes_requested" && "Changes Requested"}
              {pr.status === "ready" && "Ready for Review"}
            </div>
          </div>

          {/* Priority */}
          <div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              Priority
            </h3>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                pr.priority === "high"
                  ? "bg-error/10 text-error"
                  : pr.priority === "low"
                    ? "bg-surface-variant text-on-surface-variant"
                    : "bg-primary/10 text-primary"
              }`}
            >
              {pr.priority.charAt(0).toUpperCase() + pr.priority.slice(1)} Priority
            </div>
          </div>

          {/* Author */}
          <div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              Author
            </h3>
            <div className="flex items-center gap-2">
              {pr.author_avatar && (
                <img
                  src={pr.author_avatar}
                  alt={pr.author}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm font-medium text-on-surface">
                {pr.author}
              </span>
            </div>
          </div>

          {/* Created At */}
          <div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              Created
            </h3>
            <span className="text-sm text-on-surface">
              {new Date(pr.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Updated At */}
          <div>
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">
              Updated
            </h3>
            <span className="text-sm text-on-surface">
              {new Date(pr.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* PR Description Card */}
      {pr.body && (
        <GlassCard>
          <h3 className="text-lg font-semibold text-on-surface mb-4">
            Description
          </h3>
          <MarkdownRenderer content={pr.body} />
        </GlassCard>
      )}

      {/* Preview Environment Card */}
      {pr.previewUrl && (
        <GlassCard>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-on-surface mb-2">
                Preview Environment
              </h3>
              <p className="text-sm text-on-surface-variant mb-4">
                Live preview environment for this pull request
              </p>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    pr.previewStatus === "running"
                      ? "bg-success/10 text-success"
                      : pr.previewStatus === "failed"
                        ? "bg-error/10 text-error"
                        : pr.previewStatus === "deploying"
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-variant text-on-surface-variant"
                  }`}
                >
                  {pr.previewStatus === "running" && (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Running
                    </>
                  )}
                  {pr.previewStatus === "deploying" && "Deploying..."}
                  {pr.previewStatus === "failed" && "Failed"}
                  {pr.previewStatus === "pending" && "Pending"}
                </span>
                <a
                  href={pr.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-on-container bg-primary hover:bg-primary/90 rounded-lg transition-colors"
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Open Preview
                </a>
              </div>
            </div>
          </div>
        </GlassCard>
      )}



      {/* CI Checks */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-on-surface">CI Checks</h3>
          {ciStatus && (
            <CIStatusBadge state={ciStatus.overall} />
          )}
        </div>
        {ciStatus ? (
          <>
            {ciStatus.totalChecks > 0 && (
              <div className="flex items-center gap-4 text-sm text-on-surface-variant mb-4">
                <span>
                  {ciStatus.passingChecks} passing
                </span>
                {ciStatus.failingChecks > 0 && (
                  <span className="text-error">
                    {ciStatus.failingChecks} failing
                  </span>
                )}
                {ciStatus.pendingChecks > 0 && (
                  <span className="text-primary">
                    {ciStatus.pendingChecks} pending
                  </span>
                )}
              </div>
            )}
            <CIChecksList checks={ciStatus.checks} />
          </>
        ) : (
          <p className="text-sm text-on-surface-variant">
            Unable to fetch CI check status
          </p>
        )}
      </GlassCard>
    </div>
  );
}
