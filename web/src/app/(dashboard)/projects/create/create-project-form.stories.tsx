import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReposData } from "@/mocks/github";
import { CreateProjectForm } from "./create-project-form";

const meta = {
	title: "Pages/Projects/CreateProject",
	component: CreateProjectForm,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta<typeof CreateProjectForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock repos data for stories
const mockReposData: ReposData = {
	github_integration_enabled: true,
	user_repos: [
		{
			id: 1,
			name: "catalyst",
			full_name: "ncrmro/catalyst",
			description: "A development platform for faster shipping",
			private: false,
			owner: {
				login: "ncrmro",
				type: "User",
				avatar_url: "https://github.com/identicons/ncrmro.png",
			},
			html_url: "https://github.com/ncrmro/catalyst",
			clone_url: "https://github.com/ncrmro/catalyst.git",
			ssh_url: "git@github.com:ncrmro/catalyst.git",
			created_at: "2024-01-15T10:00:00Z",
			updated_at: "2024-01-20T15:30:00Z",
			pushed_at: "2024-01-20T15:30:00Z",
			language: "TypeScript",
			stargazers_count: 42,
			forks_count: 8,
			open_issues_count: 3,
		},
		{
			id: 2,
			name: "meze",
			full_name: "ncrmro/meze",
			description: "Meal planning application",
			private: true,
			owner: {
				login: "ncrmro",
				type: "User",
				avatar_url: "https://github.com/identicons/ncrmro.png",
			},
			html_url: "https://github.com/ncrmro/meze",
			clone_url: "https://github.com/ncrmro/meze.git",
			ssh_url: "git@github.com:ncrmro/meze.git",
			created_at: "2024-01-15T10:00:00Z",
			updated_at: "2024-01-20T15:30:00Z",
			pushed_at: "2024-01-20T15:30:00Z",
			language: "TypeScript",
			stargazers_count: 5,
			forks_count: 1,
			open_issues_count: 0,
		},
	],
	organizations: [
		{
			login: "acme-corp",
			id: 100,
			avatar_url: "https://github.com/identicons/acme-corp.png",
			description: "ACME Corporation",
		},
	],
	org_repos: {
		"acme-corp": [
			{
				id: 201,
				name: "internal-api",
				full_name: "acme-corp/internal-api",
				description: "Internal API services",
				private: true,
				owner: {
					login: "acme-corp",
					type: "Organization",
					avatar_url: "https://github.com/identicons/acme-corp.png",
				},
				html_url: "https://github.com/acme-corp/internal-api",
				clone_url: "https://github.com/acme-corp/internal-api.git",
				ssh_url: "git@github.com:acme-corp/internal-api.git",
				created_at: "2024-01-15T10:00:00Z",
				updated_at: "2024-01-20T15:30:00Z",
				pushed_at: "2024-01-20T15:30:00Z",
				language: "Go",
				stargazers_count: 10,
				forks_count: 2,
				open_issues_count: 5,
			},
		],
	},
};

/**
 * Default state - empty form with loading indicator (fetching repos)
 */
export const Default: Story = {
	args: {},
};

/**
 * GitHub connected - shows repository dropdown with user and org repos
 */
export const GitHubConnected: Story = {
	args: {
		initialGitHubStatus: "connected",
		initialRepos: mockReposData,
		onSubmit: (data) => console.log("Submit:", data),
		onCancel: () => console.log("Cancel"),
	},
};

/**
 * GitHub configured but user not connected - prompts to connect
 */
export const GitHubNotConnected: Story = {
	args: {
		initialGitHubStatus: "not_connected",
		onSubmit: (data) => console.log("Submit:", data),
		onCancel: () => console.log("Cancel"),
	},
};

/**
 * GitHub not configured (local dev without credentials)
 */
export const GitHubNotConfigured: Story = {
	args: {
		initialGitHubStatus: "not_configured",
		onSubmit: (data) => console.log("Submit:", data),
		onCancel: () => console.log("Cancel"),
	},
};

/**
 * With cancel handler - shows the form with navigation back
 */
export const WithHandlers: Story = {
	args: {
		initialGitHubStatus: "connected",
		initialRepos: mockReposData,
		onSubmit: (data) => console.log("Submit:", data),
		onCancel: () => console.log("Cancel"),
	},
};

/**
 * Submitting state - shows the form in loading state
 */
export const Submitting: Story = {
	args: {
		initialGitHubStatus: "connected",
		initialRepos: mockReposData,
		isSubmitting: true,
	},
};
