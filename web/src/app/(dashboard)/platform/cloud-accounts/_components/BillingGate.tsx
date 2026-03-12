import Link from "next/link";
import { Card } from "@/components/ui/card";

export function BillingGate() {
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-on-surface mb-2">
          Upgrade to unlock Cloud Accounts
        </h3>
        <p className="text-on-surface-variant max-w-md mx-auto">
          Connect your AWS, GCP, or Azure accounts to provision infrastructure
          directly from Catalyst. Available on the Pro plan.
        </p>
        <div className="mt-6">
          <Link
            href="/platform/billing/upgrade"
            className="px-4 py-2 text-sm font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
          >
            View Plans
          </Link>
        </div>
      </div>
    </Card>
  );
}
