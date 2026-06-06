"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

type VPNProvider = "tailscale" | "headscale";
type ConnectionStatus = "disconnected" | "connecting" | "connected";

export function VPNSetup() {
  const [provider, setProvider] = useState<VPNProvider>("tailscale");
  const [authKey, setAuthKey] = useState("");
  const [coordinationUrl, setCoordinationUrl] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  const handleConnect = () => {
    setStatus("connecting");
    setTimeout(() => setStatus("connected"), 2000);
  };

  const statusStyles = {
    disconnected: "bg-surface-variant text-on-surface-variant",
    connecting: "bg-warning/10 text-warning",
    connected: "bg-primary/10 text-primary",
  } as const;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-on-surface">VPN Access</h3>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
          >
            {status}
          </span>
        </div>
        <p className="text-sm text-on-surface-variant">
          Connect to your cluster network via Tailscale or Headscale.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setProvider("tailscale")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              provider === "tailscale"
                ? "bg-primary text-on-primary"
                : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80"
            }`}
          >
            Tailscale (Managed)
          </button>
          <button
            onClick={() => setProvider("headscale")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              provider === "headscale"
                ? "bg-primary text-on-primary"
                : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80"
            }`}
          >
            Headscale (Self-hosted)
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant">Auth Key</label>
            <input
              type="password"
              value={authKey}
              onChange={(e) => setAuthKey(e.target.value)}
              placeholder="tskey-auth-..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {provider === "headscale" && (
            <div className="space-y-1.5">
              <label className="text-xs text-on-surface-variant">
                Coordination Server URL
              </label>
              <input
                type="url"
                value={coordinationUrl}
                onChange={(e) => setCoordinationUrl(e.target.value)}
                placeholder="https://headscale.example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleConnect}
            disabled={
              !authKey ||
              status === "connecting" ||
              (provider === "headscale" && !coordinationUrl)
            }
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-opacity ${
              authKey &&
              status !== "connecting" &&
              (provider !== "headscale" || coordinationUrl)
                ? "text-on-primary bg-primary hover:opacity-90"
                : "bg-surface-variant text-on-surface-variant cursor-not-allowed"
            }`}
          >
            {status === "connecting" ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </Card>
  );
}
