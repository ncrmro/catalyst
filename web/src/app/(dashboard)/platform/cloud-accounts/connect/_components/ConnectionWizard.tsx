"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProviderSelector } from "./ProviderSelector";
import { OnboardingInstructions } from "./OnboardingInstructions";
import { linkCloudAccount } from "@/actions/cloud-accounts";

type Step = "provider" | "instructions" | "arn" | "verify";

const steps: { key: Step; label: string }[] = [
  { key: "provider", label: "Provider" },
  { key: "instructions", label: "Setup" },
  { key: "arn", label: "Connect" },
  { key: "verify", label: "Verify" },
];

interface ConnectionWizardProps {
  teamId: string;
}

export function ConnectionWizard({ teamId }: ConnectionWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("provider");
  const [provider, setProvider] = useState("aws");
  const [name, setName] = useState("My AWS Account");
  const [arn, setArn] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);

    // Extract account ID from ARN
    // arn:aws:iam::123456789012:role/CatalystCrossAccountRole
    const parts = arn.split(":");
    const externalAccountId = parts[4] || "unknown";

    try {
      const result = await linkCloudAccount(teamId, {
        provider,
        name,
        externalAccountId,
        credentialType: "iam-role",
        credential: arn,
        resourcePrefix: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      });

      if (result.success) {
        setVerified(true);
        // Refresh and redirect after 2s
        setTimeout(() => {
          router.push("/platform/cloud-accounts");
          router.refresh();
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleProviderSelect = (p: string) => {
    setProvider(p);
    setCurrentStep("instructions");
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
        <ProviderSelector onSelect={handleProviderSelect} />
      )}

      {currentStep === "instructions" && (
        <OnboardingInstructions onContinue={() => setCurrentStep("arn")} />
      )}

      {currentStep === "arn" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Account Details
            </h2>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface-variant">
                Account Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production AWS"
                className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface-variant">
                IAM Role ARN
              </label>
              <p className="text-xs text-on-surface-variant mb-2">
                Paste the Role ARN from the CloudFormation stack outputs.
              </p>
              <input
                type="text"
                value={arn}
                onChange={(e) => setArn(e.target.value)}
                placeholder="arn:aws:iam::123456789012:role/CatalystCrossAccountRole"
                className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="p-3 rounded-lg bg-surface-variant/50 border border-outline/30">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-on-surface-variant">Sample ARN</p>
                <button
                  onClick={() =>
                    setArn(
                      "arn:aws:iam::123456789012:role/CatalystCrossAccountRole",
                    )
                  }
                  className="text-xs text-primary hover:underline"
                >
                  Use sample
                </button>
              </div>
              <p className="text-xs text-on-surface font-mono">
                arn:aws:iam::123456789012:role/CatalystCrossAccountRole
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep("instructions")}
              className="px-4 py-2 text-sm font-medium rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep("verify")}
              disabled={!arn.startsWith("arn:aws:iam::") || !name}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-opacity ${
                arn.startsWith("arn:aws:iam::") && name
                  ? "text-on-primary bg-primary hover:opacity-90"
                  : "bg-surface-variant text-on-surface-variant cursor-not-allowed"
              }`}
            >
              Continue
            </button>
          </div>
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

                  {error && (
                    <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setCurrentStep("arn")}
                      className="px-4 py-2 text-sm font-medium rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerify}
                      className="px-4 py-2 text-sm font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
                    >
                      Verify Connection
                    </button>
                  </div>
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
                Redirecting...
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
