import { fetchProjectBySlug } from "@/actions/projects";
import { indexSpecFolders } from "@/actions/specs";
import { getProjectSpecs } from "@/models/specs";
import { SpecBrowser, type SpecFolder } from "@/components/platform/SpecBrowser";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

interface SpecsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SpecsPage({ params }: SpecsPageProps) {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  // Fetch specs from DB
  const specs = await getProjectSpecs(project.id);

  // Map to UI model
  const uiSpecs: SpecFolder[] = specs.map((s) => ({
    id: s.id,
    slug: s.slug,
    number: s.specNumber,
    title: s.title,
    status: s.status as SpecFolder["status"],
    completionPercentage: s.completionPercentage,
    taskCount: s.tasks.length,
    completedTaskCount: s.tasks.filter((t) => t.status === "complete").length,
    lastSyncedAt: s.lastSyncedAt || undefined,
  }));

  async function handleRefresh() {
    "use server";
    if (project) {
      await indexSpecFolders(project.id);
      revalidatePath(`/projects/${slug}/platform/specs`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Specifications</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage project requirements and track implementation progress
          </p>
        </div>
        <form action={handleRefresh}>
          <button
            type="submit"
            className="px-4 py-2 bg-surface-variant text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-variant/80 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync from Repo
          </button>
        </form>
      </div>

      {uiSpecs.length > 0 ? (
        <SpecBrowser specs={uiSpecs} projectId={project.id} projectSlug={slug} />
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-outline/30 rounded-xl">
          <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4 text-on-surface-variant">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-on-surface">No specs found</h3>
          <p className="text-on-surface-variant max-w-md mx-auto mt-2 mb-6">
            Create a `specs/` directory in your repository and add markdown files to get started.
          </p>
          <form action={handleRefresh}>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity"
            >
              Scan Repository
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
