import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { within, userEvent, expect } from "storybook/test";
import {
  CreateProjectWizard,
  SelectedRepository,
} from "./create-project-wizard";
import type { ReposData } from "@/mocks/github";

const meta = {
  title: "Pages/Projects/CreateProjectWizard",
  component: CreateProjectWizard,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CreateProjectWizard>;

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
    {
      id: 3,
      name: "no-description-repo",
      full_name: "ncrmro/no-description-repo",
      description: null,
      private: false,
      owner: {
        login: "ncrmro",
        type: "User",
        avatar_url: "https://github.com/identicons/ncrmro.png",
      },
      html_url: "https://github.com/ncrmro/no-description-repo",
      clone_url: "https://github.com/ncrmro/no-description-repo.git",
      ssh_url: "git@github.com:ncrmro/no-description-repo.git",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-20T15:30:00Z",
      pushed_at: "2024-01-20T15:30:00Z",
      language: "JavaScript",
      stargazers_count: 0,
      forks_count: 0,
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

// Pre-selected repos for Step 2 stories
const catalystRepo: SelectedRepository = {
  fullName: "ncrmro/catalyst",
  url: "https://github.com/ncrmro/catalyst",
  isManual: false,
  name: "catalyst",
  description: "A development platform for faster shipping",
};

const mezeRepo: SelectedRepository = {
  fullName: "ncrmro/meze",
  url: "https://github.com/ncrmro/meze",
  isManual: false,
  name: "meze",
  description: "Meal planning application",
};

const noDescriptionRepo: SelectedRepository = {
  fullName: "ncrmro/no-description-repo",
  url: "https://github.com/ncrmro/no-description-repo",
  isManual: false,
  name: "no-description-repo",
  description: undefined,
};

// =============================================================================
// Step 1: Repository Selection Stories
// =============================================================================

/**
 * Step 1 - Empty: No repositories selected, Continue button is disabled
 */
export const Step1_Empty: Story = {
  args: {
    initialStep: "repos",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
};

/**
 * Step 1 - One Repo Selected: One repository selected, Continue button is enabled
 */
export const Step1_OneRepoSelected: Story = {
  args: {
    initialStep: "repos",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    initialSelectedRepos: [catalystRepo],
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
};

/**
 * Step 1 - Multiple Repos: Multiple repositories selected, shows count
 */
export const Step1_MultipleRepos: Story = {
  args: {
    initialStep: "repos",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    initialSelectedRepos: [catalystRepo, mezeRepo],
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
};

/**
 * Step 1 - GitHub Not Connected: Shows prompt to connect GitHub
 */
export const Step1_GitHubNotConnected: Story = {
  args: {
    initialStep: "repos",
    initialGitHubStatus: "not_connected",
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
};

/**
 * Step 1 - GitHub Not Configured: Shows manual URL entry only
 */
export const Step1_GitHubNotConfigured: Story = {
  args: {
    initialStep: "repos",
    initialGitHubStatus: "not_configured",
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
};

// =============================================================================
// Step 2: Project Details Stories
// =============================================================================

/**
 * Step 2 - Auto-filled: Project details auto-filled from first repo (catalyst)
 * Name: "catalyst", Slug: "catalyst", Description: "A development platform..."
 */
export const Step2_AutoFilled: Story = {
  args: {
    initialStep: "details",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    initialSelectedRepos: [catalystRepo],
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
};

/**
 * Step 2 - No Description: Repo has no description, description field is empty
 * TODO: This is where AI-generated description would be useful
 */
export const Step2_NoDescription: Story = {
  args: {
    initialStep: "details",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    initialSelectedRepos: [noDescriptionRepo],
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
};

/**
 * Step 2 - Multiple Repos: Multiple repos selected, auto-fills from first one
 * TODO: AI-generated description combining multiple repos would be useful here
 */
export const Step2_MultipleRepos: Story = {
  args: {
    initialStep: "details",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    initialSelectedRepos: [catalystRepo, mezeRepo],
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
};

/**
 * Step 2 - Submitting: Form is in submitting state
 */
export const Step2_Submitting: Story = {
  args: {
    initialStep: "details",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    initialSelectedRepos: [catalystRepo],
    isSubmitting: true,
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
};

// =============================================================================
// Interaction Tests
// =============================================================================

/**
 * Full Flow: Complete wizard interaction test
 * 1. Starts on Step 1
 * 2. Opens dropdown and selects catalyst repo
 * 3. Clicks Continue
 * 4. Verifies Step 2 has auto-filled values from catalyst repo
 * 5. Clicks Create Project
 */
export const FullFlow: Story = {
  args: {
    initialStep: "repos",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify we're on Step 1
    await expect(canvas.getByText("Select Repositories")).toBeInTheDocument();

    // 2. Continue button should be disabled (no repos selected)
    const continueButton = canvas.getByRole("button", { name: /continue/i });
    await expect(continueButton).toBeDisabled();

    // 3. Open the repo dropdown
    const dropdown = canvas.getByTestId("repo-dropdown");
    await userEvent.click(dropdown);

    // 4. Wait for dropdown to open and search for catalyst
    const searchInput = canvas.getByTestId("repo-search");
    await userEvent.type(searchInput, "catalyst");

    // 5. Click on the catalyst repo
    const catalystOption = canvas.getByText("ncrmro/catalyst");
    await userEvent.click(catalystOption);

    // 6. Verify repo was added (shows "1 added")
    await expect(canvas.getByText("1 added")).toBeInTheDocument();

    // 7. Continue button should now be enabled
    await expect(continueButton).toBeEnabled();

    // 8. Click Continue to go to Step 2
    await userEvent.click(continueButton);

    // 9. Verify we're on Step 2
    await expect(canvas.getByText("Project Details")).toBeInTheDocument();

    // 10. Verify auto-fill from first repo
    const nameInput = canvas.getByRole("textbox", { name: /project name/i });
    await expect(nameInput).toHaveValue("catalyst");

    const slugInput = canvas.getByRole("textbox", { name: /project slug/i });
    await expect(slugInput).toHaveValue("catalyst");

    // 11. Verify Create Project button exists
    const createButton = canvas.getByRole("button", {
      name: /create project/i,
    });
    await expect(createButton).toBeInTheDocument();
  },
};

/**
 * Back Navigation: Test going back from Step 2 to Step 1
 */
export const BackNavigation: Story = {
  args: {
    initialStep: "details",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    initialSelectedRepos: [catalystRepo],
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Verify we're on Step 2
    await expect(canvas.getByText("Project Details")).toBeInTheDocument();

    // 2. Click Back button
    const backButton = canvas.getByRole("button", { name: /back/i });
    await userEvent.click(backButton);

    // 3. Verify we're back on Step 1
    await expect(canvas.getByText("Select Repositories")).toBeInTheDocument();

    // 4. Verify the previously selected repo is still there
    await expect(canvas.getByText("ncrmro/catalyst")).toBeInTheDocument();
  },
};

/**
 * Manual URL Entry: Test adding a manual URL
 */
export const ManualUrlEntry: Story = {
  args: {
    initialStep: "repos",
    initialGitHubStatus: "connected",
    initialRepos: mockReposData,
    onSubmit: (data) => console.log("Submit:", data),
    onCancel: () => console.log("Cancel"),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Open the repo dropdown
    const dropdown = canvas.getByTestId("repo-dropdown");
    await userEvent.click(dropdown);

    // 2. Click "Enter URL manually"
    const manualOption = canvas.getByText("Enter URL manually");
    await userEvent.click(manualOption);

    // 3. Enter a manual URL
    const urlInput = canvas.getByTestId("manual-url-input");
    await userEvent.type(urlInput, "https://github.com/example/external-repo");

    // 4. Click add button
    const addButton = canvas.getByTestId("add-manual-url");
    await userEvent.click(addButton);

    // 5. Verify repo was added
    await expect(canvas.getByText("1 added")).toBeInTheDocument();
    await expect(
      canvas.getByText("https://github.com/example/external-repo"),
    ).toBeInTheDocument();
  },
};
