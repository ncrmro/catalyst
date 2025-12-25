import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CommitCard } from "./commit-card";
import type { CommitWithRepo } from "@/actions/commits";

// Mock commit factory helper
function createMockCommit(
  overrides: Partial<CommitWithRepo> = {},
): CommitWithRepo {
  return {
    sha: overrides.sha ?? "abc123def456789",
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
      "https://github.com/example/repo/commit/abc123def456789",
    repositoryFullName: overrides.repositoryFullName ?? "example/repo",
    projectId: overrides.projectId ?? "proj-123",
    projectName: overrides.projectName ?? "Example Project",
  };
}

const meta = {
  title: "Components/CommitCard",
  component: CommitCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    commit: {
      description: "Commit data to display",
    },
  },
} satisfies Meta<typeof CommitCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    commit: createMockCommit(),
  },
};

export const LongMessage: Story = {
  args: {
    commit: createMockCommit({
      message:
        "fix: Resolve critical bug in authentication flow that was causing users to be logged out unexpectedly when navigating between pages. This required refactoring the session management and adding proper error handling throughout the auth middleware.",
    }),
  },
};

export const ShortMessage: Story = {
  args: {
    commit: createMockCommit({
      message: "chore: Update deps",
    }),
  },
};

export const WithoutAvatar: Story = {
  args: {
    commit: createMockCommit({
      authorAvatarUrl: undefined,
      author: "automated-bot",
    }),
  },
};

export const RecentCommit: Story = {
  args: {
    commit: createMockCommit({
      date: new Date(),
      message: "feat: Just pushed this feature moments ago",
    }),
  },
};

export const OldCommit: Story = {
  args: {
    commit: createMockCommit({
      date: new Date("2023-06-01T08:00:00Z"),
      message: "Initial commit",
      author: "project-creator",
    }),
  },
};

export const MultilineMessage: Story = {
  args: {
    commit: createMockCommit({
      message: `feat: Add user profile management

- Add profile editing form
- Implement avatar upload
- Add email verification
- Add password change functionality

Closes #123`,
    }),
  },
};

export const DifferentProjects: Story = {
  render: () => (
    <div className="space-y-4">
      <CommitCard
        commit={createMockCommit({
          projectName: "Frontend App",
          repositoryFullName: "company/frontend",
          message: "style: Update button styles",
        })}
      />
      <CommitCard
        commit={createMockCommit({
          projectName: "Backend API",
          repositoryFullName: "company/backend",
          message: "feat: Add new API endpoint",
          author: "backend-dev",
          authorAvatarUrl: "https://github.com/backend-dev.png",
        })}
      />
      <CommitCard
        commit={createMockCommit({
          projectName: "Mobile App",
          repositoryFullName: "company/mobile",
          message: "fix: Resolve crash on iOS 17",
          author: "mobile-team",
          authorAvatarUrl: "https://github.com/mobile-team.png",
        })}
      />
    </div>
  ),
};
