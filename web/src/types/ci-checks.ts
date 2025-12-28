/**
 * CI Check Status Types
 * Part of spec 009-projects - US3: View CI Check Status
 * T004: CI check types file
 */

/**
 * Normalized CI check status state
 */
export type CheckState = "pending" | "passing" | "failing" | "cancelled" | "skipped" | "neutral";

/**
 * Source of the CI check
 */
export type CheckSource =
  | "github-actions"
  | "cloudflare"
  | "vercel"
  | "catalyst"
  | "external";

/**
 * Normalized representation of a CI check from various sources
 * (GitHub Checks API + Commit Statuses API)
 */
export interface StatusCheck {
  /** Unique identifier for this check */
  id: string;

  /** Display name of the check */
  name: string;

  /** Current state of the check */
  state: CheckState;

  /** URL to view detailed check results/logs */
  url?: string;

  /** Short description of the check result */
  description?: string;

  /** Context string (used for grouping or categorization) */
  context: string;

  /** When the check started */
  startedAt?: Date;

  /** When the check completed */
  completedAt?: Date;

  /** Duration in milliseconds (calculated from startedAt and completedAt) */
  duration?: number;

  /** Source system that ran the check */
  source: CheckSource;

  /** Conclusion from GitHub Checks API (more detailed than state) */
  conclusion?: string;
}

/**
 * Summary of all checks for a commit
 */
export interface ChecksSummary {
  /** Total number of checks */
  total: number;

  /** Number of passing checks */
  passing: number;

  /** Number of failing checks */
  failing: number;

  /** Number of pending checks */
  pending: number;

  /** Number of cancelled checks */
  cancelled: number;

  /** Number of skipped checks */
  skipped: number;

  /** Overall status (all passing, some failing, or pending) */
  overallStatus: "success" | "failure" | "pending" | "neutral";

  /** All individual checks */
  checks: StatusCheck[];
}
