/**
 * Loading component for pull requests page
 */
export function PullRequestsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 bg-surface-variant rounded animate-pulse w-48"></div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface border border-outline rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-surface-variant rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-surface-variant rounded animate-pulse w-12"></div>
                    <div className="h-4 bg-surface-variant rounded animate-pulse w-16"></div>
                    <div className="h-4 bg-surface-variant rounded animate-pulse w-14"></div>
                  </div>
                  <div className="h-3 bg-surface-variant rounded animate-pulse w-24"></div>
                </div>
              </div>
            </div>

            <div className="h-5 bg-surface-variant rounded animate-pulse w-full mb-2"></div>
            <div className="h-5 bg-surface-variant rounded animate-pulse w-3/4 mb-3"></div>

            <div className="h-4 bg-surface-variant rounded animate-pulse w-32 mb-3"></div>

            <div className="flex items-center justify-between">
              <div className="h-3 bg-surface-variant rounded animate-pulse w-20"></div>
              <div className="h-3 bg-surface-variant rounded animate-pulse w-20"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}