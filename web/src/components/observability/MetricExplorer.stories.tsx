import type { Meta, StoryObj } from "@storybook/react";
import { MetricExplorer, type QueryResult } from "./MetricExplorer";

const meta: Meta<typeof MetricExplorer> = {
	title: "Observability/MetricExplorer",
	component: MetricExplorer,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MetricExplorer>;

const mockResults: QueryResult[] = [
	{
		metric: {
			__name__: "http_requests_total",
			method: "GET",
			handler: "/api/users",
			status: "200",
		},
		values: [[1704960000, "10"]],
	},
	{
		metric: {
			__name__: "http_requests_total",
			method: "POST",
			handler: "/api/users",
			status: "201",
		},
		values: [[1704960000, "5"]],
	},
];

export const Default: Story = {
	args: {
		initialQuery: 'sum(rate(http_requests_total{job="api"}[5m])) by (status)',
		onRunQuery: (q) => console.log(`Run query: ${q}`),
		results: mockResults,
	},
};

export const Loading: Story = {
	args: {
		initialQuery: "up",
		isLoading: true,
	},
};

export const Empty: Story = {
	args: {
		results: [],
	},
};
