// Billing meter identifiers (configured in Stripe Dashboard)
export const BILLING_METERS = {
  ACTIVE_ENV_DAY: "active_env_day",
  SPINDOWN_ENV_DAY: "spindown_env_day",
  MANAGED_CLUSTER: "managed_cluster",
  OBSERVABILITY_STACK: "observability_stack",
  MANAGED_CLUSTER_HOUR: "managed_cluster_hour",
  MANAGED_NODE_HOUR: "managed_node_hour",
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
  MANAGED_CLUSTER_MONTHLY: 100, // $100/mo per cluster
  OBSERVABILITY_STACK_MONTHLY: 200, // $200/mo per cluster
} as const;

// Cloud resource pricing (for display purposes, actual prices in Stripe)
export const CLOUD_PRICING = {
  CLUSTER_MANAGEMENT_MONTHLY: 99, // $99/month per managed cluster
  NODE_MANAGEMENT_MONTHLY: 25, // $25/month per managed node
} as const;
