// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  GoldenSignalDashboard,
  type GoldenSignal,
} from "./GoldenSignalDashboard";

const meta: Meta<typeof GoldenSignalDashboard> = {
  title: "Observability/GoldenSignalDashboard",
  component: GoldenSignalDashboard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof GoldenSignalDashboard>;

const generateHistory = (base: number, variance: number) =>
  Array.from({ length: 20 }, (_, i) => ({
    timestamp: Date.now() - (20 - i) * 60000,
    value: Math.max(0, base + (Math.random() - 0.5) * variance),
  }));

const mockSignals: GoldenSignal[] = [
  {
    type: "latency",
    currentValue: 124,
    unit: "ms",
    status: "healthy",
    trend: "flat",
    history: generateHistory(120, 20),
  },
  {
    type: "traffic",
    currentValue: 1540,
    unit: "rps",
    status: "healthy",
    trend: "up",
    history: generateHistory(1500, 100),
  },
  {
    type: "errors",
    currentValue: 0.05,
    unit: "%",
    status: "healthy",
    trend: "flat",
    history: generateHistory(0.04, 0.02),
  },
  {
    type: "saturation",
    currentValue: 65,
    unit: "%",
    status: "warning",
    trend: "up",
    history: generateHistory(60, 5).map((h, i) => ({
      ...h,
      value: h.value + i,
    })), // Increasing trend
  },
];

export const Default: Story = {
  args: {
    signals: mockSignals,
  },
};

export const CriticalState: Story = {
  args: {
    signals: mockSignals.map((s) =>
      s.type === "errors"
        ? {
            ...s,
            status: "critical" as const,
            currentValue: 5.2,
            history: generateHistory(5, 1),
          }
        : s,
    ),
  },
};
