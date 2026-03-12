// Billing constants — sourced from @catalyst/billing constants
const FREE_TIER_LIMITS = {
  ACTIVE_ENVIRONMENTS: 3,
  SPUNDOWN_ENVIRONMENTS: 5,
  PROJECTS: 1,
} as const;

const PRICING = {
  ACTIVE_ENV_MONTHLY: 3.5,
  SPUNDOWN_ENV_MONTHLY: 0.75,
} as const;
import { PricingCard } from "./_components/PricingCard";

export default function UpgradePage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PricingCard
          name="Free"
          price="Free"
          description="Get started with basic deployments"
          features={[
            `${FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS} active environments`,
            `${FREE_TIER_LIMITS.SPUNDOWN_ENVIRONMENTS} spundown environments`,
            `${FREE_TIER_LIMITS.PROJECTS} project`,
            "Community support",
          ]}
          ctaLabel="Current Plan"
          ctaDisabled
        />
        <PricingCard
          name="Pro"
          price={`$${PRICING.ACTIVE_ENV_MONTHLY.toFixed(2)}`}
          description="Scale with pay-as-you-go pricing"
          features={[
            `${FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS} free active environments, then $${PRICING.ACTIVE_ENV_MONTHLY}/mo each`,
            `${FREE_TIER_LIMITS.SPUNDOWN_ENVIRONMENTS} free spundown environments, then $${PRICING.SPUNDOWN_ENV_MONTHLY}/mo each`,
            "Unlimited projects",
            "Cloud account connections",
            "Priority support",
          ]}
          highlighted
          ctaLabel="Subscribe"
          ctaDisabled
        />
      </div>
    </div>
  );
}
