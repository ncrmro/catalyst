import type { Meta, StoryObj } from "@storybook/react";
import type { Alert } from "./AlertList";
import {
	IncidentView,
	type LogEntry,
	type MetricSnapshot,
} from "./IncidentView";

const meta: Meta<typeof IncidentView> = {
	title: "Observability/IncidentView",
	component: IncidentView,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof IncidentView>;

const mockAlerts: Alert[] = [
	{
		id: "1",
		name: "HighLatency",
		severity: "critical",
		status: "firing",
		startsAt: new Date(),
		summary: "API Latency > 500ms",
		labels: { service: "users-api" },
	},
];

const mockLogs: LogEntry[] = [
	{
		timestamp: new Date(Date.now() - 5000),
		level: "info",
		service: "users-api",
		message: "Incoming request GET /users/123",
	},
	{
		timestamp: new Date(Date.now() - 4000),
		level: "warn",
		service: "users-api",
		message: "Database connection pool exhausted, retrying...",
	},
	{
		timestamp: new Date(Date.now() - 3000),
		level: "error",
		service: "users-api",
		message: "Connection timeout waiting for db-shard-01",
	},
	{
		timestamp: new Date(Date.now() - 2000),
		level: "error",
		service: "users-api",
		message: "Unhandled exception in getUser handler: ConnectionError",
	},
];

const mockMetrics: MetricSnapshot[] = [
	{
		name: "http_request_duration_seconds",
		unit: "s",
		values: Array.from({ length: 20 }, (_, i) => ({
			time: Date.now() - (20 - i) * 1000,
			value: i > 15 ? 0.5 + Math.random() * 0.5 : 0.05 + Math.random() * 0.02,
		})),
	},
	{
		name: "db_pool_active_connections",
		unit: "",
		values: Array.from({ length: 20 }, (_, i) => ({
			time: Date.now() - (20 - i) * 1000,
			value: i > 12 ? 100 : 40 + Math.random() * 10,
		})),
	},
];

export const Default: Story = {
	args: {
		incidentId: "inc-123",
		relatedAlerts: mockAlerts,
		logs: mockLogs,
		metrics: mockMetrics,
	},
};
