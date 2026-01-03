import { GlassCard } from "@tetrastack/react-glass-components";
import Link from "next/link";

export type SpecFolderStatus = "draft" | "active" | "complete";

export interface SpecFolder {
  id: string;
  slug: string; // e.g., '001-user-auth'
  number: number;
  title: string;
  status: SpecFolderStatus;
  completionPercentage: number;
  taskCount: number;
  completedTaskCount: number;
  lastSyncedAt?: Date;
}

export interface SpecBrowserProps {
  specs: SpecFolder[];
  projectId: string;
  projectSlug: string;
}

export function SpecBrowser({ specs, projectSlug }: SpecBrowserProps) {
  const getStatusBadge = (status: SpecFolderStatus) => {
    switch (status) {
      case "active":
        return "bg-primary/10 text-primary border-primary/20";
      case "complete":
        return "bg-success/10 text-success border-success/20";
      case "draft":
        return "bg-surface-variant text-on-surface-variant border-white/10";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {specs.map((spec) => (
        <Link
          key={spec.id}
          href={`/projects/${projectSlug}/spec/${spec.slug}`}
          className="block group"
        >
          <GlassCard className="h-full hover:bg-white/5 transition-colors relative overflow-hidden">
            {/* Progress bar background */}
            <div
              className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full"
              role="progressbar"
              aria-valuenow={spec.completionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-primary"
                style={{ width: `${spec.completionPercentage}%` }}
              />
            </div>

            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-sm text-on-surface-variant bg-surface-variant/50 px-2 py-1 rounded">
                {String(spec.number).padStart(3, "0")}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full border uppercase tracking-wide ${getStatusBadge(
                  spec.status,
                )}`}
              >
                {spec.status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">
              {spec.title}
            </h3>

            <div className="flex items-center justify-between text-sm text-on-surface-variant mt-4">
              <span>
                {spec.completedTaskCount}/{spec.taskCount} tasks
              </span>
              <span>{spec.completionPercentage}%</span>
            </div>
          </GlassCard>
        </Link>
      ))}

      {/* New Spec Button Placeholder */}
      <button className="h-full min-h-[160px] border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface hover:border-white/20 hover:bg-white/5 transition-all group">
        <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
        <span className="font-medium">Create New Spec</span>
      </button>
    </div>
  );
}
