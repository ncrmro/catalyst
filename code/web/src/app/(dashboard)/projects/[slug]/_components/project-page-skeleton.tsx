import { Card } from "@/components/ui/card";

function LoadingSpinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <div
      className={`${className} border-2 border-primary border-t-transparent rounded-full animate-spin`}
    />
  );
}

function TasksSectionSkeleton({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Card className="min-h-[300px]">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
          {subtitle && (
            <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>
          )}
        </div>

        {/* Loading Indicator in Tab Position */}
        <div className="flex items-center gap-2.5 px-4 py-1.5 bg-surface-container/50 rounded-lg border border-outline/10 shadow-sm">
          <LoadingSpinner className="w-4 h-4" />
          <span className="text-xs font-semibold text-on-surface-variant/80 uppercase tracking-wider">
            Loading
          </span>
        </div>
      </div>

      {/* Content Rows */}
      <div className="space-y-6 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3">
            {/* Spec Header */}
            <div className="flex items-center justify-between px-1">
              <div className="h-5 w-40 bg-surface-variant/30 rounded" />
              <div className="h-5 w-16 bg-surface-variant/20 rounded" />
            </div>
            {/* List Items */}
            <div className="border border-outline/20 rounded-lg divide-y divide-outline/20 bg-surface-variant/5">
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <div className="h-5 w-3/4 bg-surface-variant/20 rounded" />
                  <div className="h-5 w-16 bg-surface-variant/20 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-4 w-24 bg-surface-variant/10 rounded" />
                  <div className="h-4 w-24 bg-surface-variant/10 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ProjectPageSkeleton() {
  return (
    <div className="space-y-6">
      <TasksSectionSkeleton
        title="Feature Tasks"
        subtitle="Active feature development and specifications"
      />

      <TasksSectionSkeleton
        title="Platform Tasks"
        subtitle="Infrastructure, maintenance, and technical debt"
      />
    </div>
  );
}
