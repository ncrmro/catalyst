"use client";

import { useState } from "react";

interface OnboardingInstructionsProps {
  onContinue: () => void;
}

const MOCK_EXTERNAL_ID = "catalyst-a1b2c3d4-e5f6";
const MOCK_TEMPLATE_URL =
  "https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https://tetraship-public.s3.amazonaws.com/onboarding/aws-cloudformation.yaml";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text to clipboard.", error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 text-xs font-medium rounded border border-outline text-on-surface-variant hover:bg-surface-variant transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function OnboardingInstructions({
  onContinue,
}: OnboardingInstructionsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-on-surface">
        Set up AWS cross-account access
      </h2>

      <ol className="space-y-6">
        <li className="space-y-2">
          <p className="text-sm font-medium text-on-surface">
            1. Copy your External ID
          </p>
          <div className="flex items-center gap-2 p-3 bg-surface-variant rounded-lg font-mono text-sm text-on-surface">
            <span className="flex-1 truncate">{MOCK_EXTERNAL_ID}</span>
            <CopyButton text={MOCK_EXTERNAL_ID} />
          </div>
        </li>

        <li className="space-y-2">
          <p className="text-sm font-medium text-on-surface">
            2. Launch the CloudFormation stack in your AWS account
          </p>
          <div className="flex items-center gap-2 p-3 bg-surface-variant rounded-lg text-sm">
            <a
              href={MOCK_TEMPLATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-primary hover:underline"
            >
              Open in AWS Console
            </a>
            <CopyButton text={MOCK_TEMPLATE_URL} />
          </div>
          <p className="text-xs text-on-surface-variant">
            This creates an IAM role that grants Catalyst read-only access to
            provision resources in your account.
          </p>
        </li>

        <li className="space-y-2">
          <p className="text-sm font-medium text-on-surface">
            3. Wait for the stack to complete, then continue
          </p>
        </li>
      </ol>

      <button
        onClick={onContinue}
        className="px-4 py-2 text-sm font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
      >
        Continue
      </button>
    </div>
  );
}
