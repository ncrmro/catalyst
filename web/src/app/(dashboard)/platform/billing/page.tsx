import Link from "next/link";
// Free tier limits — sourced from @catalyst/billing constants
const FREE_TIER_LIMITS = {
  ACTIVE_ENVIRONMENTS: 3,
  SPUNDOWN_ENVIRONMENTS: 5,
  PROJECTS: 1,
} as const;
import { PlanCard } from "./_components/PlanCard";
import { Card } from "@/components/ui/card";

// Mock usage data — replace with real data from server action later
const mockUsage = {
  activeEnvironments: 2,
  spundownEnvironments: 1,
  projects: 1,
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PlanCard
        plan="Free"
        usage={mockUsage}
        limits={{
          activeEnvironments: FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS,
          spundownEnvironments: FREE_TIER_LIMITS.SPUNDOWN_ENVIRONMENTS,
          projects: FREE_TIER_LIMITS.PROJECTS,
        }}
      />

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-on-surface">
              Need more resources?
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Upgrade to Pro for unlimited projects and pay-as-you-go
              environments.
            </p>
          </div>
          <Link
            href="/platform/billing/upgrade"
            className="px-4 py-2 text-sm font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
          >
            View Plans
          </Link>
        </div>
      </Card>
    </div>
  );
}
