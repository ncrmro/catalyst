import { GlassCard } from "@tetrastack/react-glass-components";

export type ConventionRule = {
  id: string;
  name: string;
  type: "lint" | "test" | "build" | "security";
  status: "pass" | "fail" | "warn";
  message?: string;
};

export interface ConventionStatusProps {
  projectName: string;
  complianceScore: number;
  rules: ConventionRule[];
  onFix?: (ruleId: string) => void;
}

export function ConventionStatus({
  projectName,
  complianceScore,
  rules,
  onFix,
}: ConventionStatusProps) {
  const getStatusColor = (status: ConventionRule["status"]) => {
    switch (status) {
      case "pass":
        return "bg-success/10 text-success border-success/20";
      case "fail":
        return "bg-error/10 text-error border-error/20";
      case "warn":
        return "bg-warning/10 text-warning border-warning/20";
    }
  };

  const getStatusIcon = (status: ConventionRule["status"]) => {
    switch (status) {
      case "pass":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "fail":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "warn":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
    }
  };

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">Convention Compliance</h3>
            <p className="text-sm text-on-surface-variant">Project: {projectName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-on-surface">{complianceScore}%</div>
              <div className="text-xs text-on-surface-variant">Score</div>
            </div>
            <div className="w-12 h-12 relative rounded-full border-4 border-surface-variant">
              <div
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent -rotate-45"
                style={{
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`, // Simple mock progress
                  transform: `rotate(${(complianceScore / 100) * 360}deg)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/10">
        {rules.map((rule) => (
          <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border ${getStatusColor(
                  rule.status,
                )}`}
              >
                {getStatusIcon(rule.status)}
              </div>
              <div>
                <div className="font-medium text-on-surface">{rule.name}</div>
                <div className="text-xs text-on-surface-variant uppercase tracking-wider">{rule.type}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {rule.message && <span className="text-sm text-on-surface-variant">{rule.message}</span>}
              {rule.status !== "pass" && onFix && (
                <button
                  onClick={() => onFix(rule.id)}
                  className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
                >
                  Auto Fix
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
