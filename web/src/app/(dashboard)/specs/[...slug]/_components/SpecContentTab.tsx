import { fetchProjectById } from "@/actions/projects";
import {
  listDirectory,
  readFile,
  type VCSEntry,
} from "@/actions/version-control-provider";
import { MarkdownRenderer } from "@tetrastack/react-markdown";

interface SpecContentTabProps {
  projectId: string;
  projectSlug: string;
  specSlug: string;
}

interface SpecFile {
  name: string;
  path: string;
  content: string;
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
    <div className="flex h-full">
      {/* File Sidebar */}
      <aside className="w-48 border-r border-outline/30 p-3 flex-shrink-0">
        <h3 className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-3">
          Files
        </h3>
        <nav className="space-y-1">
          {specFiles.map((file, index) => (
            <button
              key={file.name}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                index === 0
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50"
              }`}
            >
              {file.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <MarkdownRenderer content={specFiles[0]?.content || ""} />
        </div>
      </main>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-on-surface-variant">{message}</p>
    </div>
  );
}
