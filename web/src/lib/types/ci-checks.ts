/**
 * CI Check Types
 *
 * Normalized representation of CI check status from various sources
 * (GitHub Checks API, Commit Statuses API, etc.)
 */

export type CICheckState =
  | "pending"
  | "passing"
  | "failing"
  | "cancelled"
  | "skipped";
export type CICheckSource =
  | "github-actions"
  | "cloudflare"
  | "vercel"
  | "catalyst"
  | "external";

export interface CICheck {
  id: string;
  name: string;
  state: CICheckState;
  url?: string; // Link to CI logs
  description?: string;
  context: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in seconds
  source: CICheckSource;
}

export interface CIStatusSummary {
  overall: CICheckState;
  checks: CICheck[];
  totalChecks: number;
  passingChecks: number;
  failingChecks: number;
  pendingChecks: number;
}
