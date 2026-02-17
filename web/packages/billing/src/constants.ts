// Billing meter identifiers (configured in Stripe Dashboard)
export const BILLING_METERS = {
  ACTIVE_ENV_DAY: "active_env_day",
  SPINDOWN_ENV_DAY: "spindown_env_day",
} as const;

// Free tier limits
export const FREE_TIER_LIMITS = {
  ACTIVE_ENVIRONMENTS: 3,
  SPUNDOWN_ENVIRONMENTS: 5,
  PROJECTS: 1,
} as const;

// Pricing (for display purposes, actual prices in Stripe)
export const PRICING = {
  ACTIVE_ENV_MONTHLY: 3.5, // $3.50/month
  SPUNDOWN_ENV_MONTHLY: 0.75, // $0.75/month
} as const;
