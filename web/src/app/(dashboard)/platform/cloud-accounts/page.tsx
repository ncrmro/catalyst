import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BillingGate } from "./_components/BillingGate";
import { CloudAccountCard } from "./_components/CloudAccountCard";

// Mock flags — replace with real checks later
const isPaidPlan = true;
const hasAccounts = true;

const mockAccounts = [
  {
    id: "aws-123456",
    provider: "aws",
    alias: "Production",
    accountId: "123456789012",
    status: "connected" as const,
    region: "us-east-1",
  },
  {
    id: "aws-789012",
    provider: "aws",
    alias: "Staging",
    accountId: "987654321098",
    status: "pending" as const,
    region: "us-west-2",
  },
];

export default function CloudAccountsPage() {
  if (!isPaidPlan) {
    return <BillingGate />;
  }

  if (!hasAccounts) {
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
        {mockAccounts.map((account) => (
          <CloudAccountCard key={account.id} {...account} />
        ))}
      </div>
    </div>
  );
}
