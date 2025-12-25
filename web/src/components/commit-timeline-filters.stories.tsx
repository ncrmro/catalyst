import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CommitTimelineFilters } from "./commit-timeline-filters";

const meta = {
  title: "Components/CommitTimelineFilters",
  component: CommitTimelineFilters,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  argTypes: {
    authors: {
      description: "List of available authors to filter by",
    },
    repositories: {
      description: "List of available repositories to filter by",
    },
    onFilterChange: {
      description: "Callback when filters change",
    },
  },
} satisfies Meta<typeof CommitTimelineFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    authors: ["johndoe", "janedoe", "automated-bot", "team-member"],
    repositories: [
      "company/frontend",
      "company/backend",
      "company/mobile",
      "company/docs",
    ],
    onFilterChange: (filters) => {
      console.log("Filters changed:", filters);
    },
  },
};

export const WithManyAuthors: Story = {
  args: {
    authors: [
      "alice",
      "bob",
      "charlie",
      "david",
      "eve",
      "frank",
      "grace",
      "henry",
      "ivy",
      "jack",
    ],
    repositories: [
      "company/frontend",
      "company/backend",
      "company/mobile",
      "company/docs",
    ],
    onFilterChange: (filters) => {
      console.log("Filters changed:", filters);
    },
  },
};

export const WithManyRepos: Story = {
  args: {
    authors: ["johndoe", "janedoe"],
    repositories: [
      "org/repo-1",
      "org/repo-2",
      "org/repo-3",
      "org/repo-4",
      "org/repo-5",
      "org/repo-6",
      "org/repo-7",
      "org/repo-8",
    ],
    onFilterChange: (filters) => {
      console.log("Filters changed:", filters);
    },
  },
};

export const Empty: Story = {
  args: {
    authors: [],
    repositories: [],
    onFilterChange: (filters) => {
      console.log("Filters changed:", filters);
    },
  },
};
