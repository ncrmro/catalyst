/**
 * Billing Guard
 *
 * Provides conditional access to billing functionality based on the BILLING_ENABLED
 * environment variable. When disabled, it provides no-op or error implementations
 * to ensure the app doesn't crash but billing features are unavailable.
 *
 * This allows self-hosted deployments to exclude billing dependencies and features.
 */

const BILLING_ENABLED = process.env.BILLING_ENABLED === "true";

/**
 * Get the billing package dynamically if enabled.
 * Returns null if billing is disabled.
 */
export async function getBilling() {
  if (!BILLING_ENABLED) {
    return null;
  }

  // Use dynamic import to avoid bundling billing code when disabled
  // and to allow the package to be missing in some environments
  try {
    return await import("@catalyst/billing");
  } catch (error) {
    console.error("Failed to load @catalyst/billing package despite BILLING_ENABLED=true", error);
    return null;
  }
}

/**
 * Check if billing is enabled.
 */
export function isBillingEnabled(): boolean {
  return BILLING_ENABLED;
}
