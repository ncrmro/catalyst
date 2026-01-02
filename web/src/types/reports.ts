import { z } from "zod";

/**
 * Shared schema for periodic reports - moved from agents/periodic-report.ts
 * This schema is used for both runtime validation and TypeScript type inference
 */
export const reportSchema = z.object({
	title: z.string().describe("Title of the periodic report"),
	summary: z.string().describe("Executive summary of the current state"),
	projectsAnalysis: z.object({
		totalProjects: z.number(),
		activeEnvironments: z.number(),
		inactiveEnvironments: z.number(),
		insights: z.array(z.string()).describe("Key insights about projects"),
	}),
	recommendations: z.array(z.string()).describe("Actionable recommendations"),
	nextSteps: z.array(z.string()).describe("Suggested next steps"),
});

export type ReportData = z.infer<typeof reportSchema>;

// Legacy interfaces for existing mock-based reports system
export interface PullRequest {
	id: number;
	title: string;
	number: number;
	author: string;
	author_avatar: string;
	repository: string;
	url: string;
	created_at: string;
	updated_at: string;
	comments_count: number;
	priority: "high" | "medium" | "low";
	status: "draft" | "ready" | "changes_requested";
	// Preview environment fields
	previewEnvironmentId?: string;
	previewUrl?: string;
	previewStatus?: "pending" | "deploying" | "running" | "failed" | "deleting";
	body?: string; // PR description
	headBranch?: string; // Source branch name
	headSha?: string; // Head commit SHA
}

export interface Issue {
	id: number;
	title: string;
	number: number;
	repository: string;
	url: string;
	created_at: string;
	updated_at: string;
	labels: string[];
	priority: "high" | "medium" | "low";
	effort_estimate: "small" | "medium" | "large";
	type: "bug" | "feature" | "improvement" | "idea";
	state: "open" | "closed";
}

export interface RepoNarrative {
	repository: string;
	recently_delivered_features: string[];
	ideal_next_tasks: string[];
	current_blockers: string[];
}

export interface Report {
	id: string;
	generated_at: string;
	period_start: string;
	period_end: string;
	summary: {
		total_prs_awaiting_review: number;
		total_priority_issues: number;
		goal_focus: string;
	};
	prs_awaiting_review: PullRequest[];
	priority_issues: Issue[];
	recommendations: string[];
	narrative_report?: {
		overview: string;
		repositories: RepoNarrative[];
	};
}
