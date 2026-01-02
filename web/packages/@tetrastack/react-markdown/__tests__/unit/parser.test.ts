import { describe, it, expect } from "vitest";
import { parseSpec, parseSpecTasks } from "../../src/parser";

describe("parser", () => {
  const sampleSpec = `---
status: active
---
# Feature Specification: Test Feature

This is a test feature.
`;

  const sampleTasks = `# Tasks: Test Feature

- [ ] T001 [P] [US-1] Parallel task
- [x] T002 [US-2] Completed task
- [ ] T003 Simple task
`;

  it("should parse spec.md", async () => {
    const result = await parseSpec(sampleSpec);
    expect(result.title).toBe("Test Feature");
    expect(result.frontmatter.status).toBe("active");
  });

  it("should parse tasks.md", async () => {
    const tasks = await parseSpecTasks(sampleTasks);
    expect(tasks).toHaveLength(3);
    
    expect(tasks[0]).toEqual({
      id: "T001",
      userStoryRef: "US-1",
      description: "Parallel task",
      isParallelizable: true,
      status: "pending",
    });

    expect(tasks[1]).toEqual({
      id: "T002",
      userStoryRef: "US-2",
      description: "Completed task",
      isParallelizable: false,
      status: "complete",
    });

    expect(tasks[2]).toEqual({
      id: "T003",
      userStoryRef: undefined,
      description: "Simple task",
      isParallelizable: false,
      status: "pending",
    });
  });
});
