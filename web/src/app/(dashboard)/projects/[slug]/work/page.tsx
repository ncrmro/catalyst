import { fetchProjectBySlug, fetchProjectPullRequests } from "@/actions/projects";
import { GlassCard } from "@tetrastack/react-glass-components";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { PullRequestCard } from "@/components/work-items/PullRequestCard";

interface WorkPageProps {
  params: Promise<{
    slug: string;
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
    description: `Pull requests and work items for ${project?.fullName || "project"}`,
  };
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { slug } = await params;

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  // Fetch PRs from GitHub
  const pullRequests = await fetchProjectPullRequests(project.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Work Items</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Open pull requests for {project.fullName}
          </p>
        </div>
      </div>

      {/* Pull Requests List */}
      {pullRequests.length > 0 ? (
        <div className="space-y-4">
          {pullRequests.map((pr) => (
            <PullRequestCard key={pr.id} pr={pr} projectSlug={slug} />
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
              No pull requests
            </h3>
            <p className="text-on-surface-variant">
              No open pull requests found for this project.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

