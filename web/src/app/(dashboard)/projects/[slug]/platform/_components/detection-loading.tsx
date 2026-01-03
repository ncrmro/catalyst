/**
 * Loading skeleton for project detection.
 *
 * Displayed while the DetectionWrapper async component is running
 * project detection via VCS provider.
 */
export function DetectionLoading() {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-on-surface">
              Detecting project configuration...
            </span>
            <p className="text-sm text-on-surface-variant mt-1">
              Analyzing repository structure
            </p>
          </div>
        </div>
      </div>
      {/* Skeleton for form fields */}
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-surface-variant/50 rounded w-1/3" />
        <div className="h-20 bg-surface-variant/50 rounded" />
        <div className="h-6 bg-surface-variant/50 rounded w-1/4" />
        <div className="h-16 bg-surface-variant/50 rounded" />
        <div className="h-6 bg-surface-variant/50 rounded w-1/4" />
        <div className="h-16 bg-surface-variant/50 rounded" />
      </div>
    </div>
  );
}
