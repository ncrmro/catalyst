import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DeploymentConfigForm,
  DeploymentConfig,
} from "./deployment-config-form";

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
}

export interface GitRepoConfig {
  repoUrl: string;
  branch: string;
  isConnected: boolean;
}

export interface EnvironmentConfig {
  name: string;
  type: "development" | "deployment";
  branch?: string;
}

export interface WizardData {
  gitRepo?: GitRepoConfig;
  deployment?: DeploymentConfig;
  environment?: EnvironmentConfig;
}

export interface SetupWizardProps {
  project: {
    slug: string;
    name: string;
    fullName: string;
  };
  initialStep?: number;
  initialData?: Partial<WizardData>;
  onComplete?: (data: WizardData) => void;
  onCancel?: () => void;
}

const STEPS: WizardStep[] = [
  {
    id: "git",
    title: "Git Repository",
    description: "Connect your repository",
    isComplete: false,
  },
  {
    id: "deployment",
    title: "Deployment Config",
    description: "Configure how to deploy",
    isComplete: false,
  },
  {
    id: "environment",
    title: "Create Environment",
    description: "Set up your first environment",
    isComplete: false,
  },
];

export function SetupWizard({
  project,
  initialStep = 0,
  initialData = {},
  onComplete,
  onCancel,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [wizardData, setWizardData] = useState<WizardData>(initialData);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete?.(wizardData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onCancel?.();
    }
  };

  const handleGitRepoSubmit = (config: GitRepoConfig) => {
    setWizardData((prev) => ({ ...prev, gitRepo: config }));
    handleNext();
  };

  const handleDeploymentSubmit = (config: DeploymentConfig) => {
    setWizardData((prev) => ({ ...prev, deployment: config }));
    handleNext();
  };

  const handleEnvironmentSubmit = (config: EnvironmentConfig) => {
    setWizardData((prev) => ({ ...prev, environment: config }));
    onComplete?.({ ...wizardData, environment: config });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Progress Indicator */}
      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-on-background">
            Set Up {project.name}
          </h1>
          <span className="text-sm text-on-surface-variant">
            Step {currentStep + 1} of {STEPS.length}
          </span>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  index < currentStep
                    ? "bg-primary text-on-primary"
                    : index === currentStep
                      ? "bg-primary text-on-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-surface-variant text-on-surface-variant",
                )}
              >
                {index < currentStep ? (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* Step Info */}
              <div className="ml-3 hidden sm:block">
                <p
                  className={cn(
                    "text-sm font-medium",
                    index <= currentStep
                      ? "text-on-surface"
                      : "text-on-surface-variant",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {step.description}
                </p>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4",
                    index < currentStep ? "bg-primary" : "bg-outline/30",
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Step Content */}
      {currentStep === 0 && (
        <GitRepoStep
          initialConfig={wizardData.gitRepo}
          onSubmit={handleGitRepoSubmit}
          onCancel={onCancel}
        />
      )}

      {currentStep === 1 && (
        <DeploymentConfigForm
          initialConfig={wizardData.deployment}
          onSubmit={handleDeploymentSubmit}
          onBack={handleBack}
        />
      )}

      {currentStep === 2 && (
        <EnvironmentStep
          project={project}
          initialConfig={wizardData.environment}
          onSubmit={handleEnvironmentSubmit}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

// Step 1: Git Repository Configuration
interface GitRepoStepProps {
  initialConfig?: GitRepoConfig;
  onSubmit: (config: GitRepoConfig) => void;
  onCancel?: () => void;
}

function GitRepoStep({ initialConfig, onSubmit, onCancel }: GitRepoStepProps) {
  const [repoUrl, setRepoUrl] = useState(initialConfig?.repoUrl || "");
  const [branch, setBranch] = useState(initialConfig?.branch || "main");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ repoUrl, branch, isConnected: true });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold text-on-surface mb-2">
          Connect Git Repository
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          Link a Git repository to enable automated deployments, preview
          environments, and CI/CD pipelines.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Repository URL
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              Enter the HTTPS URL of your GitHub repository
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Default Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              The branch to use for production deployments
            </p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Step 3: Environment Creation (simplified version - will integrate existing form)
interface EnvironmentStepProps {
  project: {
    slug: string;
    name: string;
  };
  initialConfig?: EnvironmentConfig;
  onSubmit: (config: EnvironmentConfig) => void;
  onBack: () => void;
}

function EnvironmentStep({
  project,
  initialConfig,
  onSubmit,
  onBack,
}: EnvironmentStepProps) {
  const [name, setName] = useState(
    initialConfig?.name || `${project.slug}-dev`,
  );
  const [type, setType] = useState<"development" | "deployment">(
    initialConfig?.type || "development",
  );
  const [branch, setBranch] = useState(initialConfig?.branch || "main");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, type, branch });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold text-on-surface mb-2">
          Create Your First Environment
        </h2>
        <p className="text-sm text-on-surface-variant mb-6">
          Create an environment to deploy and test your application. You can add
          more environments later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Environment Type Selection */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-3">
              Environment Type
            </label>
            <div className="space-y-3">
              <label
                className={cn(
                  "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all",
                  type === "development"
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-outline/50 hover:border-outline hover:bg-surface/50",
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value="development"
                  checked={type === "development"}
                  onChange={() => setType("development")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-on-surface">
                      Development
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-success-container text-on-success-container">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    For local development, testing, and preview deployments.
                    Agents can work in this environment.
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all",
                  type === "deployment"
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-outline/50 hover:border-outline hover:bg-surface/50",
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value="deployment"
                  checked={type === "deployment"}
                  onChange={() => setType("deployment")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium text-on-surface">
                    Deployment
                  </span>
                  <p className="text-sm text-on-surface-variant">
                    For staging or production deployments. Typically tied to a
                    specific branch.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Environment Name */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Environment Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project-dev"
              className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              A unique name for this environment (lowercase, hyphens allowed)
            </p>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50"
            />
            <p className="mt-1 text-xs text-on-surface-variant">
              The Git branch to deploy from
            </p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity"
            >
              Create Environment
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
