import { isBillingEnabled } from "@/lib/billing-guard";
import {
  createCheckoutSession,
  createBillingPortalSession,
  getTeamBillingStatus,
} from "@/actions/billing";
import { fetchUserTeams } from "@/actions/teams";
import { BillingSettings } from "@catalyst/billing/src/components/BillingSettings";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Billing — Catalyst",
  description: "Manage your team's billing plan and usage.",
};

export default async function BillingPage() {
  if (!isBillingEnabled()) {
    notFound();
  }

  const teams = await fetchUserTeams();
  const adminTeam = teams.find((t) => t.role === "owner" || t.role === "admin");

  if (!adminTeam) {
    redirect("/teams");
  }

  const statusResult = await getTeamBillingStatus(adminTeam.id);

  if (!statusResult.success || !statusResult.data) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-on-surface mb-2">Billing</h1>
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-sm text-error">
          {statusResult.error ?? "Unable to load billing information."}
        </div>
      </div>
    );
  }

  const upgradeAction = createCheckoutSession.bind(null, adminTeam.id);
  const portalAction = createBillingPortalSession.bind(null, adminTeam.id);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Billing</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage your plan and usage for{" "}
          <span className="font-medium text-on-surface">{adminTeam.name}</span>.
        </p>
      </div>

      <BillingSettings
        teamId={adminTeam.id}
        teamName={adminTeam.name}
        billingStatus={statusResult.data}
        onUpgrade={upgradeAction}
        onManageSubscription={portalAction}
      />
    </div>
  );
}
