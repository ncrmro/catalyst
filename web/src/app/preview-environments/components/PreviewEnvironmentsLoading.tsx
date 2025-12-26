/**
 * Loading skeleton for preview environments list
 */
export function PreviewEnvironmentsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-surface-variant rounded animate-pulse" />
      </div>

      <div className="bg-surface border border-outline rounded-lg overflow-hidden">
        <div className="divide-y divide-outline">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-surface-variant rounded-full animate-pulse" />
                  <div className="h-5 w-32 bg-surface-variant rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-4 w-24 bg-surface-variant rounded animate-pulse" />
                  <div className="h-4 w-20 bg-surface-variant rounded animate-pulse" />
                  <div className="h-6 w-16 bg-surface-variant rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
