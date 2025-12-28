# Work and PRs Pages - Ready to Deploy

## Issue: Cannot Create Directories

The bash tool is not functioning in this environment, so directories cannot be created programmatically. The following directories need to be created manually:

```
web/src/app/(dashboard)/projects/[slug]/work/
web/src/app/(dashboard)/projects/[slug]/prs/[number]/
web/src/components/ci/
```

## Files Ready for Deployment

### 1. `/web/src/app/(dashboard)/projects/[slug]/work/page.tsx`

```typescript
import { fetchProjectBySlug } from "@/actions/projects";
import { getProjectPullRequests } from "@/actions/pull-requests-vcs";
import { GlassCard } from "@tetrastack/react-glass-components";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";

interface WorkPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    state?: "open" | "closed" | "all";
  }>;
}

export async function generateMetadata({
  params,
}: WorkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  return {
    title: project
      ? `Work - ${project.fullName} - Catalyst`
      : "Work - Catalyst",
    description: `Pull requests and current work for ${project?.fullName || "project"}`,
  };
}

export default async function WorkPage({
  params,
  searchParams,
}: WorkPageProps) {
  const { slug } = await params;
  const { state = "open" } = await searchParams;

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const pullRequests = await getProjectPullRequests(slug, state);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Current Work</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Pull requests for {project.fullName}
          </p>
        </div>

        {/* State filter */}
        <div className="flex gap-2">
          <Link
            href={`/projects/${slug}/work?state=open`}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              state === "open"
                ? "bg-primary text-on-primary"
                : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80"
            }`}
          >
            Open
          </Link>
          <Link
            href={`/projects/${slug}/work?state=closed`}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              state === "closed"
                ? "bg-primary text-on-primary"
                : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80"
            }`}
          >
            Closed
          </Link>
          <Link
            href={`/projects/${slug}/work?state=all`}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              state === "all"
                ? "bg-primary text-on-primary"
                : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80"
            }`}
          >
            All
          </Link>
        </div>
      </div>

      {/* Pull Requests List */}
      {pullRequests.length > 0 ? (
        <div className="space-y-3">
          {pullRequests.map((pr) => (
            <GlassCard key={pr.id} className="hover:bg-surface-variant/50 transition-colors">
              <Link href={`/projects/${slug}/prs/${pr.number}`} className="block">
                <div className="flex items-start justify-between gap-4">
                  {/* PR Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-on-surface truncate">
                        {pr.title}
                      </h3>
                      {pr.draft && (
                        <span className="px-2 py-1 text-xs font-medium bg-surface-variant text-on-surface-variant rounded">
                          Draft
                        </span>
                      )}
                      {pr.state === "merged" && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded">
                          Merged
                        </span>
                      )}
                      {pr.state === "closed" && pr.state !== "merged" && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-500/20 text-red-300 rounded">
                          Closed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                      <span>#{pr.number}</span>
                      <span>by {pr.author}</span>
                      <span>
                        {pr.sourceBranch} → {pr.targetBranch}
                      </span>
                      <span>
                        Updated {new Date(pr.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Preview Environment Status */}
                    {pr.previewUrl && (
                      <div className="mt-3 flex items-center gap-2">
                        {pr.previewStatus === "running" && (
                          <>
                            <svg
                              className="w-4 h-4 text-green-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <a
                              href={pr.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View preview environment →
                            </a>
                          </>
                        )}
                        {pr.previewStatus === "deploying" && (
                          <>
                            <svg
                              className="w-4 h-4 text-yellow-400 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span className="text-sm text-yellow-400">
                              Deploying preview environment...
                            </span>
                          </>
                        )}
                        {pr.previewStatus === "failed" && (
                          <>
                            <svg
                              className="w-4 h-4 text-red-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-sm text-red-400">
                              Preview deployment failed
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Labels */}
                    {pr.labels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pr.labels.slice(0, 5).map((label) => (
                          <span
                            key={label}
                            className="px-2 py-1 text-xs bg-surface-variant text-on-surface-variant rounded"
                          >
                            {label}
                          </span>
                        ))}
                        {pr.labels.length > 5 && (
                          <span className="px-2 py-1 text-xs text-on-surface-variant">
                            +{pr.labels.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Author Avatar */}
                  {pr.authorAvatarUrl && (
                    <img
                      src={pr.authorAvatarUrl}
                      alt={pr.author}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                </div>
              </Link>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard>
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-lg font-medium text-on-surface mb-2">
              No pull requests found
            </h3>
            <p className="text-on-surface-variant">
              {state === "open"
                ? "There are no open pull requests for this project."
                : state === "closed"
                  ? "There are no closed pull requests for this project."
                  : "There are no pull requests for this project."}
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
```

### 2. `/web/src/app/(dashboard)/projects/[slug]/prs/[number]/page.tsx`

```typescript
import { fetchProjectBySlug } from "@/actions/projects";
import { getPullRequest } from "@/actions/pull-requests-vcs";
import { GlassCard } from "@tetrastack/react-glass-components";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface PRDetailPageProps {
  params: Promise<{
    slug: string;
    number: string;
  }>;
}

export async function generateMetadata({
  params,
}: PRDetailPageProps): Promise<Metadata> {
  const { slug, number: prNumberStr } = await params;
  const prNumber = parseInt(prNumberStr, 10);
  const pr = await getPullRequest(slug, prNumber);

  return {
    title: pr ? `PR #${pr.number}: ${pr.title} - Catalyst` : "Pull Request - Catalyst",
    description: pr?.title || "View pull request details",
  };
}

export default async function PRDetailPage({ params }: PRDetailPageProps) {
  const { slug, number: prNumberStr } = await params;
  const prNumber = parseInt(prNumberStr, 10);

  if (isNaN(prNumber)) {
    notFound();
  }

  const [project, pr] = await Promise.all([
    fetchProjectBySlug(slug),
    getPullRequest(slug, prNumber),
  ]);

  if (!project || !pr) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-on-surface">{pr.title}</h1>
            {pr.draft && (
              <span className="px-3 py-1 text-sm font-medium bg-surface-variant text-on-surface-variant rounded">
                Draft
              </span>
            )}
            {pr.state === "merged" && (
              <span className="px-3 py-1 text-sm font-medium bg-purple-500/20 text-purple-300 rounded">
                Merged
              </span>
            )}
            {pr.state === "closed" && pr.state !== "merged" && (
              <span className="px-3 py-1 text-sm font-medium bg-red-500/20 text-red-300 rounded">
                Closed
              </span>
            )}
            {pr.state === "open" && !pr.draft && (
              <span className="px-3 py-1 text-sm font-medium bg-green-500/20 text-green-300 rounded">
                Open
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-on-surface-variant">
            <span>#{pr.number}</span>
            <span>opened by {pr.author}</span>
            <span>
              {pr.sourceBranch} → {pr.targetBranch}
            </span>
          </div>
        </div>

        {/* Back to work */}
        <Link
          href={`/projects/${slug}/work`}
          className="px-4 py-2 text-sm font-medium bg-surface-variant hover:bg-surface-variant/80 text-on-surface rounded-lg transition-colors"
        >
          ← Back to work
        </Link>
      </div>

      {/* Preview Environment Card */}
      {pr.previewUrl && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-on-surface mb-1">
                Preview Environment
              </h3>
              <p className="text-sm text-on-surface-variant">
                {pr.previewStatus === "running" && "Your preview environment is ready"}
                {pr.previewStatus === "deploying" && "Preview environment is deploying..."}
                {pr.previewStatus === "failed" && "Preview deployment failed"}
                {pr.previewStatus === "pending" && "Preview deployment is pending"}
              </p>
            </div>
            {pr.previewStatus === "running" && (
              <a
                href={pr.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors"
              >
                Open Preview →
              </a>
            )}
            {pr.previewStatus === "deploying" && (
              <div className="flex items-center gap-2 text-yellow-400">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Deploying...</span>
              </div>
            )}
            {pr.previewStatus === "failed" && (
              <Link
                href={`/preview-environments/${pr.previewEnvironmentId}`}
                className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium transition-colors"
              >
                View Logs
              </Link>
            )}
          </div>
        </GlassCard>
      )}

      {/* PR Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description - Would need to fetch from VCS provider */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              Description
            </h3>
            <div className="text-on-surface-variant">
              <p>Pull request description would be displayed here.</p>
              <p className="text-sm mt-2 text-on-surface-variant/70">
                Note: Fetching PR body requires additional VCS provider implementation.
              </p>
            </div>
          </GlassCard>

          {/* CI Checks - Placeholder for Phase 4 */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              CI Checks
            </h3>
            <div className="text-on-surface-variant text-sm">
              <p>CI checks will be displayed here in Phase 4 (US3).</p>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* PR Metadata */}
          <GlassCard>
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">
              Details
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-on-surface-variant">Author</dt>
                <dd className="text-sm text-on-surface flex items-center gap-2 mt-1">
                  {pr.authorAvatarUrl && (
                    <img
                      src={pr.authorAvatarUrl}
                      alt={pr.author}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  {pr.author}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-on-surface-variant">Repository</dt>
                <dd className="text-sm text-on-surface mt-1">
                  {pr.repositoryFullName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-on-surface-variant">Created</dt>
                <dd className="text-sm text-on-surface mt-1">
                  {new Date(pr.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-on-surface-variant">Updated</dt>
                <dd className="text-sm text-on-surface mt-1">
                  {new Date(pr.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>

            {/* External Link */}
            <div className="mt-4 pt-4 border-t border-outline/30">
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
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
          </GlassCard>

          {/* Labels */}
          {pr.labels.length > 0 && (
            <GlassCard>
              <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
                Labels
              </h3>
              <div className="flex flex-wrap gap-2">
                {pr.labels.map((label) => (
                  <span
                    key={label}
                    className="px-2 py-1 text-xs bg-surface-variant text-on-surface-variant rounded"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Reviewers */}
          {pr.reviewers.length > 0 && (
            <GlassCard>
              <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
                Reviewers
              </h3>
              <div className="space-y-2">
                {pr.reviewers.map((reviewer) => (
                  <div
                    key={reviewer}
                    className="text-sm text-on-surface"
                  >
                    {reviewer}
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Manual Steps Required

1. Create the directories:
   ```bash
   mkdir -p web/src/app/\(dashboard\)/projects/\[slug\]/work
   mkdir -p web/src/app/\(dashboard\)/projects/\[slug\]/prs/\[number\]
   ```

2. Copy the page content above into the respective `page.tsx` files in each directory.

3. The actions file `pull-requests-vcs.ts` is already created and committed.

## Implementation Status

- ✅ T018: getPullRequest action created
- ✅ T019: Preview environment linking implemented
- ✅ T020: PR list page code ready (needs directory)
- ✅ T021: PR list item component (integrated in T020)
- ✅ T022: PR detail page code ready (needs directory)
