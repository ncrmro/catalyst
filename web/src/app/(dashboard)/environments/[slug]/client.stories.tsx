import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ProjectWithRelations } from "@/types/projects";
import { type EnvironmentResult, EnvironmentsForm } from "./client";

// Mock submit handler for stories
const mockSubmit = async (formData: FormData): Promise<EnvironmentResult> => {
	console.log("onSubmit", Object.fromEntries(formData));
	// Simulate async operation
	await new Promise((resolve) => setTimeout(resolve, 500));
	return {
		success: true,
		message: "Environment configured successfully",
		environmentId: "env_123",
		environmentType: formData.get("environmentType") as string,
		projectId: formData.get("projectId") as string,
	};
};

const meta = {
	title: "Pages/Environments/ConfigureEnvironment",
	component: EnvironmentsForm,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta<typeof EnvironmentsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock factory for creating test projects
function createMockProject(
	overrides: Partial<ProjectWithRelations> = {},
): ProjectWithRelations {
	return {
		id: "proj_123",
		slug: "catalyst-web",
		name: "Catalyst Web",
		fullName: "catalyst/web",
		description: "Main web application",
		ownerLogin: "catalyst",
		ownerType: "Organization",
		ownerAvatarUrl: null,
		teamId: "team_789",
		previewEnvironmentsCount: 0,
		createdAt: new Date("2024-01-15"),
		updatedAt: new Date("2024-01-15"),
		repo: {
			id: "repo_456",
			githubId: 123456,
			name: "catalyst-web",
			fullName: "catalyst/web",
			description: "Main web application",
			url: "https://github.com/catalyst/web",
			isPrivate: true,
			language: "TypeScript",
			stargazersCount: 42,
			forksCount: 5,
			openIssuesCount: 3,
			ownerLogin: "catalyst",
			ownerType: "Organization",
			ownerAvatarUrl: null,
			teamId: "team_789",
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-15"),
			pushedAt: new Date("2024-01-15"),
		},
		team: {
			id: "team_789",
			name: "Engineering",
			description: null,
			ownerId: "user_123",
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
		},
		repositories: [
			{
				projectId: "proj_123",
				repoId: "repo_456",
				isPrimary: true,
				createdAt: new Date("2024-01-01"),
				repo: {
					id: "repo_456",
					githubId: 123456,
					name: "catalyst-web",
					fullName: "catalyst/web",
					description: "Main web application",
					url: "https://github.com/catalyst/web",
					isPrivate: true,
					language: "TypeScript",
					stargazersCount: 42,
					forksCount: 5,
					openIssuesCount: 3,
					ownerLogin: "catalyst",
					ownerType: "Organization",
					ownerAvatarUrl: null,
					teamId: "team_789",
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-15"),
					pushedAt: new Date("2024-01-15"),
				},
			},
		],
		environments: [],
		...overrides,
	} as ProjectWithRelations;
}

/**
 * Default state - Shows the new 2-option design with Development selected
 */
export const Default: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
	},
};

/**
 * Development environment selected (default state)
 */
export const DevelopmentSelected: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
	},
};

/**
 * Deployment environment selected - shows Production/Staging sub-options
 */
export const DeploymentSelected: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
	},
};

/**
 * Deployment → Production selected path
 */
export const DeploymentProductionSelected: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
	},
};

/**
 * Deployment → Staging selected path
 */
export const DeploymentStagingSelected: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
	},
};

/**
 * Interactive example - all states can be tested
 */
export const Interactive: Story = {
	args: {
		project: createMockProject({
			name: "My Application",
			slug: "my-app",
			fullName: "my-org/my-app",
		}),
		onSubmit: mockSubmit,
	},
};

/**
 * With existing environments - shows context
 */
export const WithExistingEnvironments: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
	},
};

/**
 * Long project name - text wrapping behavior
 */
export const LongProjectName: Story = {
	args: {
		project: createMockProject({
			name: "Very Long Project Name That Might Cause Display Issues in the UI",
			fullName:
				"very-long-org-name/very-long-project-name-that-might-cause-display-issues",
			slug: "very-long-project-name-that-might-cause-display-issues",
		}),
		onSubmit: mockSubmit,
	},
};

/**
 * Mobile viewport - responsive design
 */
export const Mobile: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
	},
	parameters: {
		viewport: {
			defaultViewport: "mobile1",
		},
	},
};

/**
 * Wizard Context - Shows form without header (for use in setup wizard)
 */
export const WizardContext: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
		hideHeader: true,
		onBack: () => console.log("Back clicked"),
		cancelButtonText: "Back",
		submitButtonText: "Create Environment",
	},
};

/**
 * Wizard Context with custom button texts
 */
export const WizardContextCustomButtons: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
		hideHeader: true,
		onBack: () => console.log("Back clicked"),
		cancelButtonText: "Previous Step",
		submitButtonText: "Complete Setup",
	},
};

/**
 * Comparison - Shows documentation of the 2-option design
 */
export const DesignOverview: Story = {
	args: {
		project: createMockProject(),
		onSubmit: mockSubmit,
	},
	decorators: [
		(Story) => (
			<div className="space-y-8 p-8 bg-background">
				<div>
					<h2 className="text-2xl font-bold text-on-background mb-4">
						Environment Configuration - Two-Option Design
					</h2>
					<p className="text-on-surface-variant mb-6">
						The redesigned interface presents two main choices: Development
						Environments (recommended for getting started) and Deployment
						Environments (with Production/Staging sub-options).
					</p>
				</div>
				<div className="max-w-4xl">
					<Story />
				</div>
				<div className="mt-8 p-6 bg-secondary-container/10 border border-secondary rounded-lg">
					<h3 className="font-semibold text-on-surface mb-3">Key Features:</h3>
					<ul className="list-disc list-inside text-on-surface-variant space-y-2">
						<li>
							<strong>Getting Started Tip</strong> appears above options (not
							below)
						</li>
						<li>
							<strong>Development Environments</strong> - Recommended for
							experimentation, no approvals required
						</li>
						<li>
							<strong>Deployment Environments</strong> - Production and Staging
							with ACLs, approval workflows, and release processes
						</li>
						<li>
							<strong>Progressive Disclosure</strong> - Sub-options
							(Production/Staging) appear only when Deployment is selected
						</li>
						<li>
							<strong>Clear Verbiage</strong> - Each option explains its
							purpose, characteristics, and when to use it
						</li>
					</ul>
				</div>
			</div>
		),
	],
};
