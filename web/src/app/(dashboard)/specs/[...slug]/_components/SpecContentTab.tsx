import { fetchProjectById } from "@/actions/projects";
import {
  listDirectory,
  readFile,
  type VCSEntry,
} from "@/actions/version-control-provider";
import { MarkdownRenderer } from "@tetrastack/react-markdown";
import { SpecViewer, type SpecFile } from "@catalyst/react-vcs-components/SpecViewer";
import { buildSpecUrl } from "@/lib/spec-url";

interface SpecContentTabProps {
  projectId: string;
  projectSlug: string;
  repoSlug?: string;
  specSlug: string;
  fileName?: string;
}

// Standard spec-kit files in priority order
const SPEC_FILES = ["spec.md", "plan.md", "tasks.md", "quickstart.md"];

export async function SpecContentTab({
  projectId,
  projectSlug,
  repoSlug,
  specSlug,
  fileName,
}: SpecContentTabProps) {
  const project = await fetchProjectById(projectId);
  if (!project) {
    return <EmptyState message="Project not found" />;
  }

  const repo = project.repositories[0]?.repo;
  if (!repo) {
    return <EmptyState message="No repository linked to this project" />;
  }

  const specPath = `specs/${specSlug}`;

  // List files in the spec directory
  const dirResult = await listDirectory(repo.fullName, specPath);
  if (!dirResult.success) {
    return <EmptyState message="Unable to load spec files" />;
  }

  // Filter to only markdown files
  const mdFiles = dirResult.entries.filter(
    (e: VCSEntry) => e.type === "file" && e.name.endsWith(".md"),
  );

  if (mdFiles.length === 0) {
    return <EmptyState message="No spec files found in this directory" />;
  }

  // Sort files: spec-kit standard files first, then others alphabetically
  const sortedFiles = [...mdFiles].sort((a, b) => {
    const aIndex = SPEC_FILES.indexOf(a.name);
    const bIndex = SPEC_FILES.indexOf(b.name);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  // Determine active file (use requested fileName or default to first file)
  const activeFileName = fileName || sortedFiles[0]?.name;
  
  // Read content only for the active file
  const activeFileEntry = sortedFiles.find((f) => f.name === activeFileName);
  let activeContent = "";
  let renderedContent: React.ReactNode = null;

  if (activeFileEntry) {
    const fileResult = await readFile(repo.fullName, activeFileEntry.path);
    activeContent = fileResult.file?.content ?? "";
    renderedContent = <MarkdownRenderer content={activeContent} />;
  }

  const specFiles: SpecFile[] = sortedFiles.map((f) => ({
    name: f.name,
    path: f.path,
    content: f.name === activeFileName ? activeContent : "",
    rendered: f.name === activeFileName ? renderedContent : undefined,
  }));

  // Construct base URL for navigation
  // Default repoSlug to projectSlug if not provided
  const effectiveRepoSlug = repoSlug || projectSlug;
  const baseHref = buildSpecUrl(projectSlug, effectiveRepoSlug, specSlug);

  return (
    <SpecViewer
      specFiles={specFiles}
      activeFile={activeFileName}
      emptyMessage="No spec files found"
      baseHref={baseHref}
    />
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-on-surface-variant">{message}</p>
    </div>
  );
}
