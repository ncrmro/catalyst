import { fetchProjectById } from "@/actions/projects";
import {
  listDirectory,
  readFile,
  type VCSEntry,
} from "@/actions/version-control-provider";
import { MarkdownRenderer } from "@tetrastack/react-markdown";
import { SpecViewer, type SpecFile } from "@catalyst/react-vcs-components/SpecViewer";

interface SpecContentTabProps {
  projectId: string;
  projectSlug: string;
  specSlug: string;
}

// Standard spec-kit files in priority order
const SPEC_FILES = ["spec.md", "plan.md", "tasks.md", "quickstart.md"];

export async function SpecContentTab({
  projectId,
  specSlug,
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

  // Read the first file (spec.md if present)
  const primaryFile = sortedFiles[0];
  const fileResult = await readFile(repo.fullName, primaryFile.path);

  const specFiles: SpecFile[] = sortedFiles.map((f) => ({
    name: f.name,
    path: f.path,
    content:
      f.path === primaryFile.path ? (fileResult.file?.content ?? "") : "",
  }));

  return (
    <SpecViewer
      specFiles={specFiles}
      activeFile={specFiles[0]?.name}
      MarkdownRenderer={MarkdownRenderer}
      emptyMessage="No spec files found"
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
