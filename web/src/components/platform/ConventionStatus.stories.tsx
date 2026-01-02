// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConventionStatus, type ConventionRule } from "./ConventionStatus";

const meta: Meta<typeof ConventionStatus> = {
  title: "Platform/ConventionStatus",
  component: ConventionStatus,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ConventionStatus>;

const mockRules: ConventionRule[] = [
  {
    id: "1",
    name: "ESLint Configuration",
    type: "lint",
    status: "pass",
    message: "Standard config match",
  },
  {
    id: "2",
    name: "Prettier Configuration",
    type: "lint",
    status: "fail",
    message: "Config missing",
  },
  {
    id: "3",
    name: "Semantic Commits",
    type: "build",
    status: "warn",
    message: "Some recent commits non-compliant",
  },
  {
    id: "4",
    name: "Dependency Audit",
    type: "security",
    status: "pass",
    message: "No high severity vulns",
  },
];

export const Default: Story = {
  args: {
    projectName: "catalyst-web",
    complianceScore: 75,
    rules: mockRules,
    onFix:  (_id: string) => console.log(`Fixing rule ${_id}`),
  },
};

export const HighCompliance: Story = {
  args: {
    projectName: "catalyst-operator",
    complianceScore: 100,
    rules: mockRules.map((r) => ({ ...r, status: "pass", message: "Compliant" })),
  },
};

export const LowCompliance: Story = {
  args: {
    projectName: "legacy-app",
    complianceScore: 25,
    rules: mockRules.map((r) => ({ ...r, status: "fail", message: "Drift detected" })),
  },
};
