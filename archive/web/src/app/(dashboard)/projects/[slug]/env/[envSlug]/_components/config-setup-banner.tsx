"use client";

import { Card } from "@/components/ui/card";

interface ConfigSetupBannerProps {
  environmentId: string;
  onSetup?: () => void;
}

export function ConfigSetupBanner({
  environmentId: _environmentId,
  onSetup,
}: ConfigSetupBannerProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-on-surface mb-2">
        Environment Configuration
      </h2>
      <p className="text-sm text-on-surface-variant mb-4">
        Configure how this environment is built and deployed.
      </p>
      <div className="p-6 rounded-lg border border-dashed border-outline/50 bg-surface-variant/20">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="text-base font-medium text-on-surface mb-2">
            Configuration Required
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-md">
            This environment needs to be configured before deployment. Set up
            the deployment method, managed services, and resource limits.
          </p>
          {onSetup && (
            <button
              type="button"
              onClick={onSetup}
              className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity"
            >
              Set Up Configuration
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
