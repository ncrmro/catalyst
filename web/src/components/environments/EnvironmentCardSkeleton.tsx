import { GlassCard } from "@tetrastack/react-glass-components";

/**
 * Skeleton loading state for the EnvironmentCard.
 */
export function EnvironmentCardSkeleton() {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-4">
        {/* Content area */}
        <div className="flex-1 space-y-2">
          {/* Title skeleton */}
          <div className="h-5 w-48 bg-surface-container rounded animate-pulse" />
          {/* Subtitle skeleton */}
          <div className="h-4 w-32 bg-surface-container rounded animate-pulse" />
          {/* Status badge skeleton */}
          <div className="h-6 w-24 bg-surface-container rounded-full animate-pulse" />
        </div>

        {/* Controls skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-surface-container rounded-lg animate-pulse" />
        </div>
      </div>
    </GlassCard>
  );
}

/**
 * Skeleton for expanded content area
 */
export function EnvironmentExpandedSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-outline/20 pb-2">
        {/* Tab skeletons */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-7 w-16 bg-surface-container rounded-md animate-pulse"
          />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="h-64 bg-surface-container/50 rounded-lg animate-pulse" />
    </div>
  );
}
