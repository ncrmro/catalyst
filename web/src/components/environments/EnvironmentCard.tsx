import { Suspense } from "react";
import { findOrCreateEnvironment } from "@/actions/preview-environments";
import { EnvironmentCardClient } from "./EnvironmentCardClient";
import { EnvironmentCardSkeleton } from "./EnvironmentCardSkeleton";
import { GlassCard } from "@tetrastack/react-glass-components";

interface EnvironmentCardProps {
  projectId: string;
  prNumber: number;
  repoFullName: string;
  branch: string;
  commitSha: string;
  projectSlug: string;
}

/**
 * Server component wrapper for EnvironmentCard.
 *
 * Uses Suspense to show a skeleton while the environment is being
 * fetched or created.
 */
export function EnvironmentCard(props: EnvironmentCardProps) {
  return (
    <Suspense fallback={<EnvironmentCardSkeleton />}>
      <EnvironmentCardContent {...props} />
    </Suspense>
  );
}

/**
 * Async server component that fetches/creates the environment.
 */
async function EnvironmentCardContent({
  projectId,
  prNumber,
  repoFullName,
  branch,
  commitSha,
  projectSlug,
}: EnvironmentCardProps) {
  const result = await findOrCreateEnvironment({
    projectId,
    prNumber,
    repoFullName,
    branch,
    commitSha,
  });

  if (!result.success || !result.data) {
    return <EnvironmentCardError error={result.error || "Unknown error"} />;
  }

  return (
    <EnvironmentCardClient
      environment={result.data.environment}
      projectSlug={projectSlug}
      prNumber={prNumber}
      isNew={result.data.isNew}
    />
  );
}

/**
 * Error state for the environment card.
 */
function EnvironmentCardError({ error }: { error: string }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h4 className="font-medium text-on-surface">Environment</h4>
          <p className="text-sm text-error mt-1">{error}</p>
        </div>
        <div className="flex items-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-error/10 text-error">
            <span className="w-2 h-2 rounded-full bg-error" />
            Error
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
