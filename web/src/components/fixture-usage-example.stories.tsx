import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { reposFixtures, projectsFixtures } from "@/lib/fixtures";

/**
 * Example component that displays repository information
 * This demonstrates how to use fixtures in Storybook
 */
function RepoCard({ repo }: { repo: typeof reposFixtures[0] }) {
  return (
    <div className="rounded-lg border border-outline bg-surface p-4 max-w-md">
      <h3 className="text-lg font-semibold text-on-surface">{repo.name}</h3>
      <p className="text-sm text-on-surface-variant mt-1">{repo.fullName}</p>
      {repo.description && (
        <p className="text-sm text-on-surface mt-2">{repo.description}</p>
      )}
      <div className="flex items-center gap-4 mt-3 text-xs text-on-surface-variant">
        <span>{repo.language}</span>
        <span>{repo.isPrivate ? "Private" : "Public"}</span>
      </div>
    </div>
  );
}

const meta = {
  title: "Examples/Fixtures Usage",
  component: RepoCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RepoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Catalyst repository using fixture data
 */
export const CatalystRepo: Story = {
  args: {
    repo: reposFixtures[0],
  },
};

/**
 * Meze repository using fixture data
 */
export const MezeRepo: Story = {
  args: {
    repo: reposFixtures[1],
  },
};

/**
 * All repositories from fixtures
 */
export const AllRepos: Story = {
  render: () => (
    <div className="space-y-4">
      {reposFixtures.map((repo) => (
        <RepoCard key={repo.githubId} repo={repo} />
      ))}
    </div>
  ),
};
