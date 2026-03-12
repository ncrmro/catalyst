"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

interface AccountDetailProps {
  id: string;
  provider: string;
  alias: string;
  accountId: string;
  status: "connected" | "pending" | "error";
  region: string;
  roleArn: string;
  externalId: string;
  resourcePrefix: string;
}

const statusStyles = {
  connected: "bg-primary/10 text-primary",
  pending: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
} as const;

export function AccountDetail({
  provider,
  alias,
  accountId,
  status,
  region,
  roleArn,
  externalId,
  resourcePrefix,
}: AccountDetailProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-variant rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-on-surface-variant">
                  {provider.toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-on-surface">
                  {alias}
                </h2>
                <p className="text-sm text-on-surface-variant font-mono">
                  {accountId}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
            >
              {status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-outline/50">
            <div>
              <p className="text-xs text-on-surface-variant">Region</p>
              <p className="text-sm text-on-surface">{region}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">Resource Prefix</p>
              <p className="text-sm text-on-surface font-mono">
                {resourcePrefix}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-on-surface-variant">Role ARN</p>
              <p className="text-sm text-on-surface font-mono break-all">
                {roleArn}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-on-surface-variant">External ID</p>
              <p className="text-sm text-on-surface font-mono">{externalId}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-3">
          <h3 className="text-base font-medium text-on-surface">
            Managed Resources
          </h3>
          <p className="text-sm text-on-surface-variant">
            No resources have been provisioned in this account yet.
          </p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-error">Danger Zone</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Disconnecting will remove Catalyst&apos;s access to this account.
            </p>
          </div>
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-error text-error hover:bg-error/10 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-2 text-sm font-medium rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                disabled
                className="px-4 py-2 text-sm font-medium rounded-lg bg-error text-on-error cursor-not-allowed opacity-60"
              >
                Confirm Disconnect
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
