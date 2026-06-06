import { Card } from "@/components/ui/card";
import { UsageBar } from "./UsageBar";

interface PlanCardProps {
  plan: string;
  usage: {
    activeEnvironments: number;
    spundownEnvironments: number;
    projects: number;
  };
  limits: {
    activeEnvironments: number;
    spundownEnvironments: number;
    projects: number;
  };
}

export function PlanCard({ plan, usage, limits }: PlanCardProps) {
  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-on-surface">Current Plan</h2>
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
            {plan}
          </span>
        </div>
        <div className="space-y-4">
          <UsageBar
            label="Active Environments"
            current={usage.activeEnvironments}
            max={limits.activeEnvironments}
          />
          <UsageBar
            label="Spundown Environments"
            current={usage.spundownEnvironments}
            max={limits.spundownEnvironments}
          />
          <UsageBar
            label="Projects"
            current={usage.projects}
            max={limits.projects}
          />
        </div>
      </div>
    </Card>
  );
}
