/**
 * Default Mock Data for MockVCSProvider
 *
 * Provides sensible defaults that can be overridden during MockVCSProvider initialization.
 */

import type { Repository, DirectoryEntry } from "../../types";

/**
 * Default mock repositories
 */
export const DEFAULT_MOCK_REPOS: Repository[] = [
  {
    id: "12345",
    name: "test-repo",
    fullName: "test-owner/test-repo",
    owner: "test-owner",
    defaultBranch: "main",
    private: false,
    htmlUrl: "https://github.com/test-owner/test-repo",
    description: "A test repository for mock VCS provider",
    language: "TypeScript",
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "67890",
    name: "another-repo",
    fullName: "test-owner/another-repo",
    owner: "test-owner",
    defaultBranch: "main",
    private: true,
    htmlUrl: "https://github.com/test-owner/another-repo",
    description: "Another test repository",
    language: "Python",
    updatedAt: new Date("2024-01-02T00:00:00Z"),
  },
];

/**
 * Default mock directory structure
 * Maps path -> array of directory entries
 */
export const DEFAULT_MOCK_DIRECTORY: Record<string, DirectoryEntry[]> = {
  specs: [
    {
      type: "dir",
      name: "001-test-feature",
      path: "specs/001-test-feature",
      sha: "mock-sha-001",
      htmlUrl: "https://github.com/test-owner/test-repo/tree/main/specs/001-test-feature",
    },
    {
      type: "dir",
      name: "002-another-feature",
      path: "specs/002-another-feature",
      sha: "mock-sha-002",
      htmlUrl: "https://github.com/test-owner/test-repo/tree/main/specs/002-another-feature",
    },
  ],
  "specs/001-test-feature": [
    {
      type: "file",
      name: "spec.md",
      path: "specs/001-test-feature/spec.md",
      sha: "mock-sha-spec-001",
      htmlUrl: "https://github.com/test-owner/test-repo/blob/main/specs/001-test-feature/spec.md",
    },
    {
      type: "file",
      name: "plan.md",
      path: "specs/001-test-feature/plan.md",
      sha: "mock-sha-plan-001",
      htmlUrl: "https://github.com/test-owner/test-repo/blob/main/specs/001-test-feature/plan.md",
    },
    {
      type: "file",
      name: "tasks.md",
      path: "specs/001-test-feature/tasks.md",
      sha: "mock-sha-tasks-001",
      htmlUrl: "https://github.com/test-owner/test-repo/blob/main/specs/001-test-feature/tasks.md",
    },
  ],
  "specs/002-another-feature": [
    {
      type: "file",
      name: "spec.md",
      path: "specs/002-another-feature/spec.md",
      sha: "mock-sha-spec-002",
      htmlUrl: "https://github.com/test-owner/test-repo/blob/main/specs/002-another-feature/spec.md",
    },
  ],
};

/**
 * Default mock file contents
 * Maps path -> content string
 */
export const DEFAULT_MOCK_FILES: Record<string, string> = {
  "specs/001-test-feature/spec.md": `# Test Feature

## Overview
This is a test feature specification.

## Requirements
- Requirement 1
- Requirement 2

## User Stories
- As a user, I want to test features
- As a developer, I want to validate mock data
`,
  "specs/001-test-feature/plan.md": `# Implementation Plan

## Steps
1. Step one
2. Step two
3. Step three

## Timeline
- Week 1: Planning
- Week 2: Implementation
- Week 3: Testing
`,
  "specs/001-test-feature/tasks.md": `# Tasks

- [ ] Task 1
- [ ] Task 2
- [x] Task 3 (completed)
`,
  "specs/002-another-feature/spec.md": `# Another Feature

## Overview
Another test specification for the mock provider.

## Goals
- Goal 1
- Goal 2
`,
};
