"use client";

import { useState } from "react";
import { ProviderSelector } from "./ProviderSelector";
import { OnboardingInstructions } from "./OnboardingInstructions";

type Step = "provider" | "instructions" | "arn" | "verify";

const steps: { key: Step; label: string }[] = [
  { key: "provider", label: "Provider" },
  { key: "instructions", label: "Setup" },
  { key: "arn", label: "Connect" },
  { key: "verify", label: "Verify" },
];

export function ConnectionWizard() {
  const [currentStep, setCurrentStep] = useState<Step>("provider");
  const [arn, setArn] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  const handleVerify = () => {
    setVerifying(true);
    // Mock 2s verification delay
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Step progress */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                i <= currentIndex
                  ? "bg-primary text-on-primary"
                  : "bg-surface-variant text-on-surface-variant"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                i <= currentIndex
                  ? "text-on-surface"
                  : "text-on-surface-variant"
              }`}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-px ${
                  i < currentIndex ? "bg-primary" : "bg-surface-variant"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {currentStep === "provider" && (
        <ProviderSelector onSelect={() => setCurrentStep("instructions")} />
      )}

      {currentStep === "instructions" && (
        <OnboardingInstructions onContinue={() => setCurrentStep("arn")} />
      )}

      {currentStep === "arn" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-on-surface">
            Enter your IAM Role ARN
          </h2>
          <p className="text-sm text-on-surface-variant">
            Paste the Role ARN from the CloudFormation stack outputs.
          </p>
          <input
            type="text"
            value={arn}
            onChange={(e) => setArn(e.target.value)}
            placeholder="arn:aws:iam::123456789012:role/CatalystCrossAccountRole"
            className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => setCurrentStep("verify")}
            disabled={!arn.startsWith("arn:aws:iam::")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-opacity ${
              arn.startsWith("arn:aws:iam::")
                ? "text-on-primary bg-primary hover:opacity-90"
                : "bg-surface-variant text-on-surface-variant cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      )}

      {currentStep === "verify" && (
        <div className="text-center space-y-4">
          {!verified ? (
            <>
              {verifying ? (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                  <p className="text-on-surface-variant">
                    Verifying connection...
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-on-surface">
                    Ready to verify
                  </h2>
                  <p className="text-sm text-on-surface-variant">
                    We&apos;ll attempt to assume the IAM role and verify access
                    to your AWS account.
                  </p>
                  <button
                    onClick={handleVerify}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
                  >
                    Verify Connection
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-on-surface">
                Account connected
              </h2>
              <p className="text-sm text-on-surface-variant">
                Your AWS account has been successfully connected to Catalyst.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
