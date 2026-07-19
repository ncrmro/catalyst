import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BillingGate } from "./_components/BillingGate";
import { CloudAccountCard } from "./_components/CloudAccountCard";
import { listCloudAccounts } from "@/actions/cloud-accounts";
import { getUserPrimaryTeamId } from "@/lib/team-auth";
import { checkTeamHasActiveSubscription } from "@/actions/billing";

export default async function CloudAccountsPage() {
  const teamId = await getUserPrimaryTeamId();

  if (!teamId) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-on-surface-variant">Team not found.</p>
      </div>
    );
  }

  // Check billing status - works for all team members
  const isPaidPlan = await checkTeamHasActiveSubscription(teamId);

  if (!isPaidPlan) {
    return <BillingGate />;
  }

  // Fetch accounts
  const result = await listCloudAccounts(teamId);

  if (!result.success) {
    return (
      <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error">
        <h3 className="font-semibold">Error loading cloud accounts</h3>
        <p className="text-sm">{result.error}</p>
      </div>
    );
  }

  const accounts = result.data;

  if (accounts.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-on-surface-variant"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-on-surface mb-2">
            No cloud accounts connected
          </h3>
          <p className="text-on-surface-variant max-w-md mx-auto">
            Connect an AWS account to start provisioning infrastructure directly
            from Catalyst.
          </p>
          <div className="mt-6">
            <Link
              href="/platform/cloud-accounts/connect"
              className="px-4 py-2 text-sm font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
            >
              Connect Account
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/platform/cloud-accounts/connect"
          className="px-4 py-2 text-sm font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
        >
          Connect Account
        </Link>
      </div>
      <div className="space-y-3">
        {accounts.map((account) => (
          <CloudAccountCard
            key={account.id}
            id={account.id}
            provider={account.provider}
            alias={account.name}
            accountId={account.externalAccountId}
            status={account.status}
            region="us-east-1" // Region might need to come from elsewhere, but the model doesn't have it yet
          />
        ))}
      </div>
    </div>
  );
}
