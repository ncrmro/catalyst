import { fetchProjectBySlug } from "@/actions/projects";
import { syncSpecTasks } from "@/actions/specs";
import { getSpecBySlug } from "@/models/specs";
import { readFile } from "@/actions/version-control-provider";
import { SpecTaskList, type SpecTask } from "@/components/platform/SpecTaskList";
import { MarkdownRenderer } from "@tetrastack/react-markdown";
import { GlassCard } from "@tetrastack/react-glass-components";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

interface SpecDetailPageProps {
  params: Promise<{
    slug: string;
    specSlug: string;
  }>;
}

export default async function SpecDetailPage({ params }: SpecDetailPageProps) {
  const { slug, specSlug } = await params;
  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const spec = await getSpecBySlug(project.id, specSlug);
  
  if (!spec) {
    notFound();
  }

  const repo = project.repositories[0]?.repo;
  let content = "";
  
  if (repo) {
    const fileResult = await readFile(repo.fullName, `specs/${specSlug}/spec.md`);
    if (fileResult.success && fileResult.file) {
      content = fileResult.file.content;
    }
  }

  // Map tasks to UI model
  const uiTasks: SpecTask[] = spec.tasks.map((t) => ({
    id: t.id,
    taskId: t.taskId,
    userStoryRef: t.userStoryRef || undefined,
    description: t.description,
    isParallelizable: t.isParallelizable,
    status: t.status as SpecTask["status"],
    linkedPrNumber: t.linkedPrNumber || undefined,
    linkedPrUrl: t.linkedPrNumber && repo ? `https://github.com/${repo.fullName}/pull/${t.linkedPrNumber}` : undefined,
  }));

  async function handleSync() {
    "use server";
    if (project) {
      await syncSpecTasks(project.id, specSlug);
      revalidatePath(`/projects/${slug}/platform/specs/${specSlug}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href={`/projects/${slug}/platform/specs`}
              className="text-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              ← Back to Specs
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">{spec.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-xs text-on-surface-variant bg-surface-variant/50 px-2 py-1 rounded">
              {specSlug}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border uppercase tracking-wide ${
              spec.status === "active" ? "bg-primary/10 text-primary border-primary/20" :
              spec.status === "complete" ? "bg-success/10 text-success border-success/20" :
              "bg-surface-variant text-on-surface-variant border-white/10"
            }`}>
              {spec.status}
            </span>
          </div>
        </div>
        <form action={handleSync}>
          <button
            type="submit"
            className="px-4 py-2 bg-surface-variant text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-variant/80 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Tasks
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard>
            <MarkdownRenderer content={content} />
          </GlassCard>
        </div>

        {/* Sidebar Tasks */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-on-surface">Implementation Tasks</h3>
            <span className="text-sm text-on-surface-variant">{spec.completionPercentage}% Complete</span>
          </div>
          
          <SpecTaskList tasks={uiTasks} />
        </div>
      </div>
    </div>
  );
}
