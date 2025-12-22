import Link from "next/link";
import { GlassCard } from "@tetrastack/react-glass-components";
import { listEnvironmentCRs } from "@/lib/k8s-operator";
import { fetchProjectById } from "@/actions/projects";

interface EnvironmentsSectionProps {
  projectId: string;
  projectSlug: string;
}

export async function EnvironmentsSection({
  projectId,
  projectSlug,
}: EnvironmentsSectionProps) {
  const project = await fetchProjectById(projectId);
  if (!project) return null;

  const sanitizedProjectName = project.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  const k8sEnvironments = await listEnvironmentCRs("default");

  // Filter environments for this project
  const environments = k8sEnvironments.filter(
    (env) => env.spec.projectRef.name === sanitizedProjectName,
  );

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface">Environments</h2>
      </div>
humbug
      <div className="divide-y divide-outline/50 -mx-6">
        {environments.length > 0 ? (
          environments.map((env) => (
            <Link
              key={env.metadata.name}
              href={`/projects/${projectSlug}/env/${env.metadata.name}`}
              className="block px-6 py-3 hover:bg-surface/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-on-surface">
                    {env.metadata.name}
                  </h3>
                  <div className="text-sm text-on-surface-variant flex gap-2">
                    <span className="capitalize">{env.spec.type}</span>
                    {env.status?.url && (
                      <span className="text-primary truncate max-w-[200px]">
                        {env.status.url}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${
                    env.status?.phase === "Ready"
                      ? "bg-success-container text-on-success-container"
                      : "bg-surface-variant text-on-surface-variant"
                  }`}
                >
                  {env.status?.phase || "Pending"}
                </span>

                <svg
                  className="w-4 h-4 text-on-surface-variant flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-on-surface-variant">
            No active environments found in cluster.
          </div>
        )}
      </div>

      {/* Add Environment Button */}
      <div className="mt-4 pt-4 border-t border-outline/50 -mx-6 px-6">
        <Link
          href={`/environments/${project.slug}`}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
        >
          Add Environment
        </Link>
      </div>
    </GlassCard>
  );
}
