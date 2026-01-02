"use client";

import { GlassCard } from "@tetrastack/react-glass-components";

interface ImplementationOverviewProps {
  specId: string;
}

export function ImplementationOverview({ specId }: ImplementationOverviewProps) {
  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold text-on-surface mb-4">Progress Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 bg-surface-variant/20 rounded-xl border border-outline/20">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Completion</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-primary">0%</span>
            <span className="text-sm text-on-surface-variant mb-1">of tasks</span>
          </div>
          <div className="mt-3 h-2 w-full bg-surface-variant rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '0%' }} />
          </div>
        </div>

        <div className="p-4 bg-surface-variant/20 rounded-xl border border-outline/20">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Pull Requests</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-on-surface">0</span>
            <span className="text-sm text-on-surface-variant mb-1">open / 0 merged</span>
          </div>
        </div>

        <div className="p-4 bg-surface-variant/20 rounded-xl border border-outline/20">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Tasks</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-on-surface">0</span>
            <span className="text-sm text-on-surface-variant mb-1">remaining</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
