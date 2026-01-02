import type { Meta, StoryObj } from "@storybook/react";
import { AlertList, type Alert } from "./AlertList";

const meta: Meta<typeof AlertList> = {
  title: "Observability/AlertList",
  component: AlertList,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AlertList>;

const mockAlerts: Alert[] = [
  {
    id: "1",
    name: "HighErrorRate",
    severity: "critical",
    status: "firing",
    startsAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    summary: "Error rate > 5% for last 5 minutes",
    labels: { service: "api-gateway", env: "production" },
  },
  {
    id: "2",
    name: "PodRestartLoop",
    severity: "warning",
    status: "firing",
    startsAt: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    summary: "Pod has restarted 5 times in 1 hour",
    labels: { pod: "worker-7f8a9", namespace: "default" },
  },
  {
    id: "3",
    name: "HighMemoryUsage",
    severity: "info",
    status: "resolved",
    startsAt: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    endsAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    summary: "Memory usage > 80%",
    labels: { node: "k3s-worker-1" },
  },
];

export const Default: Story = {
  args: {
    alerts: mockAlerts,
    onAlertClick: (id) => console.log(`Alert clicked: ${id}`),
  },
};

export const Empty: Story = {
  args: {
    alerts: [],
  },
};
