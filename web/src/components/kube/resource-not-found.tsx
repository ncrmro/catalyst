"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";

interface KubeResourceNotFoundProps {
  resourceType: string;
  resourceName: string;
}

export function KubeResourceNotFound({
  resourceType,
  resourceName,
}: KubeResourceNotFoundProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <GlassCard>
      <div className="py-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-on-error-container"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-on-surface mb-2">
            {resourceType} Not Found in Cluster
          </h2>
          <p className="text-on-surface-variant max-w-md">
            The {resourceType.toLowerCase()} &quot;{resourceName}&quot; was not
            found in the Kubernetes cluster.
          </p>
        </div>

        <div className="bg-surface-variant/50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-on-surface mb-2">
            Possible causes:
          </h3>
          <ul className="text-sm text-on-surface-variant space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-on-surface-variant">•</span>
              <span>Resource was deleted externally</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-on-surface-variant">•</span>
              <span>
                Developer ran <code className="font-mono">make reset</code>{" "}
                which cleared the cluster
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-on-surface-variant">•</span>
              <span>Cluster connectivity issues</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-on-surface-variant">•</span>
              <span>Operator has not yet reconciled the resource</span>
            </li>
          </ul>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleRetry}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Retrying...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry
              </>
            )}
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
