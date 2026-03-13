"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

interface KubeconfigSetupProps {
  clusterEndpoint?: string;
}

const KUBECTL_SNIPPET = `kubectl config set-credentials catalyst-user \\
  --exec-api-version=client.authentication.k8s.io/v1beta1 \\
  --exec-command=kubectl \\
  --exec-arg=oidc-login \\
  --exec-arg=get-token \\
  --exec-arg=--oidc-issuer-url=https://auth.tetraship.app \\
  --exec-arg=--oidc-client-id=catalyst-cluster`;

export function KubeconfigSetup({
  clusterEndpoint = "https://k8s.us-east-1.cloud.tetraship.app:6443",
}: KubeconfigSetupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(KUBECTL_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <div className="space-y-4">
        <h3 className="text-base font-medium text-on-surface">
          Cluster Access
        </h3>
        <p className="text-sm text-on-surface-variant">
          Access your cluster using kubectl with Catalyst as the OIDC identity
          provider.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-on-surface-variant">
              Cluster Endpoint
            </p>
            <p className="text-sm text-on-surface font-mono mt-1">
              {clusterEndpoint}
            </p>
          </div>

          <div>
            <p className="text-xs text-on-surface-variant mb-1">
              OIDC Provider
            </p>
            <p className="text-sm text-on-surface">
              Catalyst (auth.tetraship.app)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">
              kubectl configuration
            </p>
            <button
              onClick={handleCopy}
              className="px-2 py-1 text-xs font-medium rounded text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-surface-variant/50 border border-outline/30 text-xs text-on-surface font-mono overflow-x-auto whitespace-pre-wrap">
            {KUBECTL_SNIPPET}
          </pre>
        </div>

        <button
          disabled
          className="px-4 py-2 text-sm font-medium rounded-lg bg-surface-variant text-on-surface-variant cursor-not-allowed"
        >
          Download Kubeconfig
        </button>
      </div>
    </Card>
  );
}
