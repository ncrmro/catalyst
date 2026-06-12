import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProjectPageContent } from "./project-page-content";
import type { Spec, PRsBySpec } from "@/lib/pr-spec-matching";
import type { PullRequest, Issue } from "@/types/reports";

// Mock data for stories
const mockSpecs: Spec[] = [
  {
    id: "009-projects",
    name: "009-projects",
    href: "/projects/catalyst/spec/009-projects",
  },
  {
    id: "001-auth-system",
    name: "001-auth-system",
    href: "/projects/catalyst/spec/001-auth-system",
  },
];

const mockPR: PullRequest = {
  id: 1,
  title: "feat(009-projects): Add project creation wizard",
  number: 42,
  author: "ncrmro",
  author_avatar: "https://github.com/ncrmro.png",
  repository: "ncrmro/catalyst",
  url: "https://github.com/ncrmro/catalyst/pull/42",
  created_at: "2024-01-10T00:00:00Z",
  updated_at: "2024-01-15T00:00:00Z",
  comments_count: 5,
  priority: "high",
  status: "ready",
};

const mockPlatformPRs: PRsBySpec = {
  bySpec: {},
  noSpec: [
    {
      ...mockPR,
      id: 2,
      number: 43,
      title: "chore: Update dependencies",
      priority: "low",
      status: "draft",
    },
  ],
};

const mockIssue: Issue = {
  id: 1,
  title: "Bug: Login fails on mobile",
  number: 100,
  repository: "ncrmro/catalyst",
  url: "https://github.com/ncrmro/catalyst/issues/100",
  created_at: "2024-01-05T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
  labels: ["bug"],
  priority: "high",
  effort_estimate: "medium",
  type: "bug",
  state: "open",
};

const mockIssues: Issue[] = [
  mockIssue,
  {
    ...mockIssue,
    id: 2,
    number: 101,
    title: "feat(009-projects): Add project templates",
    type: "feature",
    labels: ["enhancement"],
    priority: "medium",
  },
];

// Helper to create dashboard promise
const createDashboardPromise = (
  specs: Spec[],
  pullRequests: PullRequest[],
  issues: Issue[],
) =>
  Promise.resolve({
    specsResult: { specs },
    pullRequests,
    issues,
  });

// All mock PRs flat list for dashboardPromise
const allMockPRs = [mockPR, ...mockPlatformPRs.noSpec];

const meta = {
  title: "Pages/Projects/ProjectPage",
  component: ProjectPageContent,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ProjectPageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - project with feature and platform PRs
 */
export const Default: Story = {
  args: {
    project: {
      id: "project-1",
      slug: "catalyst",
      name: "Catalyst",
      fullName: "ncrmro/catalyst",
    },
    dashboardPromise: createDashboardPromise(mockSpecs, allMockPRs, mockIssues),
  },
};

/**
 * Meze project - shows different project's PRs
 */
export const MezeProject: Story = {
  args: {
    project: {
      id: "project-2",
      slug: "meze",
      name: "Meze",
      fullName: "ncrmro/meze",
    },
    dashboardPromise: createDashboardPromise(
      [
        {
          id: "002-recipe-import",
          name: "002-recipe-import",
          href: "/projects/meze/spec/002-recipe-import",
        },
      ],
      [
        {
          ...mockPR,
          id: 10,
          number: 15,
          title: "feat(002-recipe-import): Add recipe parser",
          repository: "ncrmro/meze",
        },
      ],
      [],
    ),
  },
};

/**
 * New project with no PRs
 */
export const NewProject: Story = {
  args: {
    project: {
      id: "project-3",
      slug: "new-project",
      name: "New Project",
      fullName: "org/new-project",
    },
    dashboardPromise: createDashboardPromise([], [], []),
  },
};
