"use client";

import { useState, useTransition } from "react";

export interface BillingSubscription {
  id: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface BillingUsage {
  activeEnvDays: number;
  spundownEnvDays: number;
}

export interface FreeTierLimits {
  ACTIVE_ENVIRONMENTS: number;
  SPUNDOWN_ENVIRONMENTS: number;
  PROJECTS: number;
}

export interface BillingStatus {
  hasSubscription: boolean;
  subscription: BillingSubscription | null;
  customerId: string | null;
  currentMonthUsage: BillingUsage;
  freeTierLimits: FreeTierLimits;
}

export interface BillingSettingsProps {
  teamId: string;
  teamName: string;
  billingStatus: BillingStatus;
  onUpgrade: () => Promise<{ success: boolean; data?: { checkoutUrl: string }; error?: string }>;
  onManageSubscription: () => Promise<{ success: boolean; data?: { portalUrl: string }; error?: string }>;
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: "bg-primary/10 text-primary border-primary/30",
    trialing: "bg-secondary/10 text-secondary border-secondary/30",
    past_due: "bg-error/10 text-error border-error/30",
    canceled: "bg-outline/20 text-on-surface-variant border-outline/30",
    incomplete: "bg-secondary/10 text-secondary border-secondary/30",
  };
  const classes = colorMap[status] ?? "bg-outline/20 text-on-surface-variant border-outline/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
    </span>
  );
}

export function BillingSettings({
  teamId: _teamId,
  teamName,
  billingStatus,
  onUpgrade,
  onManageSubscription,
}: BillingSettingsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPaid = billingStatus.hasSubscription &&
    billingStatus.subscription?.status === "active";

  const handleUpgrade = () => {
    setError(null);
    startTransition(async () => {
      const result = await onUpgrade();
      if (result.success && result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        setError(result.error ?? "Failed to start upgrade. Please try again.");
      }
    });
  };

  const handleManageSubscription = () => {
    setError(null);
    startTransition(async () => {
      const result = await onManageSubscription();
      if (result.success && result.data?.portalUrl) {
        window.location.href = result.data.portalUrl;
      } else {
        setError(result.error ?? "Failed to open billing portal. Please try again.");
      }
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <div className="bg-surface border border-outline rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">Current Plan</h2>
            <p className="text-sm text-on-surface-variant mt-1">{teamName}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isPaid ? (
              <>
                <StatusBadge status={billingStatus.subscription!.status} />
                {billingStatus.subscription?.cancelAtPeriodEnd && (
                  <span className="text-xs text-error">
                    Cancels {formatDate(billingStatus.subscription.currentPeriodEnd)}
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-outline/20 text-on-surface-variant border-outline/30">
                Free Tier
              </span>
            )}
          </div>
        </div>

        {isPaid && billingStatus.subscription?.currentPeriodEnd && !billingStatus.subscription.cancelAtPeriodEnd && (
          <p className="text-sm text-on-surface-variant mt-4">
            Next billing date: {formatDate(billingStatus.subscription.currentPeriodEnd)}
          </p>
        )}
      </div>

      {/* Usage */}
      <div className="bg-surface border border-outline rounded-xl p-6">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Usage This Month</h2>
        <div className="space-y-4">
          <UsageRow
            label="Active environment-days"
            value={billingStatus.currentMonthUsage.activeEnvDays}
            isPaid={isPaid}
          />
          <UsageRow
            label="Spun-down environment-days"
            value={billingStatus.currentMonthUsage.spundownEnvDays}
            isPaid={isPaid}
          />
        </div>

        {!isPaid && (
          <div className="mt-4 pt-4 border-t border-outline">
            <p className="text-sm font-medium text-on-surface mb-2">Free tier limits</p>
            <ul className="space-y-1 text-sm text-on-surface-variant">
              <li>{billingStatus.freeTierLimits.ACTIVE_ENVIRONMENTS} active environments</li>
              <li>{billingStatus.freeTierLimits.SPUNDOWN_ENVIRONMENTS} spun-down environments</li>
              <li>{billingStatus.freeTierLimits.PROJECTS} project</li>
            </ul>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-sm text-error">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="bg-surface border border-outline rounded-xl p-6">
        <h2 className="text-lg font-semibold text-on-surface mb-4">
          {isPaid ? "Manage Subscription" : "Upgrade to Paid"}
        </h2>

        {isPaid ? (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              View invoices, update payment method, or cancel your subscription in the billing portal.
            </p>
            <button
              onClick={handleManageSubscription}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Opening portal…" : "Manage Subscription"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">
              Upgrade to remove free tier limits and pay only for what you use — $3.50/month per
              active environment-day, $0.75/month per spun-down environment-day.
            </p>
            <button
              onClick={handleUpgrade}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Redirecting…" : "Upgrade"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function UsageRow({ label, value, isPaid }: { label: string; value: number; isPaid: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-outline last:border-0">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <span className="text-sm font-medium text-on-surface">
        {value.toLocaleString()}
        {!isPaid && <span className="text-on-surface-variant font-normal"> (free)</span>}
      </span>
    </div>
  );
}
