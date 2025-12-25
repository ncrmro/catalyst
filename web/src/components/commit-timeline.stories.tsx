import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CommitTimeline } from "./commit-timeline";
import type { CommitWithRepo } from "@/actions/commits";

// Mock commit factory helper
function createMockCommit(
  overrides: Partial<CommitWithRepo> = {},
): CommitWithRepo {
  return {
    sha: overrides.sha ?? Math.random().toString(36).substring(7),
    message:
      overrides.message ??
      "feat: Add new feature with comprehensive implementation",
    author: overrides.author ?? "johndoe",
    authorEmail: overrides.authorEmail ?? "john.doe@example.com",
    authorAvatarUrl:
      overrides.authorAvatarUrl ?? "https://github.com/johndoe.png",
    date: overrides.date ?? new Date("2024-01-15T10:30:00Z"),
    htmlUrl:
      overrides.htmlUrl ??
      `https://github.com/example/repo/commit/${overrides.sha ?? "abc123"}`,
    repositoryFullName: overrides.repositoryFullName ?? "example/repo",
    projectId: overrides.projectId ?? "proj-123",
    projectName: overrides.projectName ?? "Example Project",
  };
}

const meta = {
  title: "Components/CommitTimeline",
  component: CommitTimeline,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    commits: {
      description: "Array of commits to display in timeline",
    },
    loading: {
      control: "boolean",
      description: "Loading state",
    },
  },
} satisfies Meta<typeof CommitTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    commits: [
      createMockCommit({
        message: "feat: Add user authentication system",
        author: "alice",
        date: new Date("2024-01-15T14:30:00Z"),
        repositoryFullName: "company/frontend",
        projectName: "Frontend App",
      }),
      createMockCommit({
        message: "fix: Resolve memory leak in connection pool",
        author: "bob",
        date: new Date("2024-01-15T12:15:00Z"),
        repositoryFullName: "company/backend",
        projectName: "Backend API",
      }),
      createMockCommit({
        message: "docs: Update API documentation",
        author: "charlie",
        date: new Date("2024-01-15T10:00:00Z"),
        repositoryFullName: "company/docs",
        projectName: "Documentation",
      }),
      createMockCommit({
        message: "chore: Update dependencies",
        author: "automated-bot",
        authorAvatarUrl: undefined,
        date: new Date("2024-01-15T08:45:00Z"),
        repositoryFullName: "company/frontend",
        projectName: "Frontend App",
      }),
      createMockCommit({
        message: "style: Improve mobile responsive design",
        author: "alice",
        date: new Date("2024-01-14T16:20:00Z"),
        repositoryFullName: "company/frontend",
        projectName: "Frontend App",
      }),
    ],
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    commits: [],
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    commits: [],
    loading: false,
  },
};

export const SingleCommit: Story = {
  args: {
    commits: [
      createMockCommit({
        message: "Initial commit",
        author: "project-creator",
        date: new Date("2024-01-01T00:00:00Z"),
      }),
    ],
    loading: false,
  },
};

export const ManyCommits: Story = {
  args: {
    commits: Array.from({ length: 20 }, (_, i) =>
      createMockCommit({
        message: `Commit #${i + 1}: Various changes to the codebase`,
        author: ["alice", "bob", "charlie", "david"][i % 4],
        date: new Date(Date.now() - i * 3600000), // Each commit 1 hour apart
        repositoryFullName: ["company/frontend", "company/backend", "company/mobile"][i % 3],
        projectName: ["Frontend App", "Backend API", "Mobile App"][i % 3],
      }),
    ),
    loading: false,
  },
};

export const MultilineMessages: Story = {
  args: {
    commits: [
      createMockCommit({
        message: `feat: Add comprehensive user management system

- Implement user CRUD operations
- Add role-based access control
- Create user profile pages
- Add email verification workflow

This is a major feature that enables proper user management
across the entire application.

Closes #456, #457, #458`,
        author: "alice",
        date: new Date("2024-01-15T14:30:00Z"),
      }),
      createMockCommit({
        message: `fix: Critical security vulnerability in auth

CVE-2024-1234: SQL injection in login endpoint
Applied parameterized queries throughout auth flow

Related: #security-123`,
        author: "security-team",
        date: new Date("2024-01-15T12:00:00Z"),
      }),
    ],
    loading: false,
  },
};
