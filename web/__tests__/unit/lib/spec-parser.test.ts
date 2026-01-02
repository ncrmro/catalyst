import { describe, it, expect } from "vitest";
import { parseSpecFile } from "@/lib/spec-parser";

describe("Spec Parser", () => {
  it("should parse metadata from frontmatter", async () => {
    const content = `---
title: My Spec
status: active
---
# Spec Content`;
    const result = await parseSpecFile(content, "001-test");
    expect(result.metadata).toEqual({
      title: "My Spec",
      status: "active",
      specNumber: 1,
      slug: "001-test",
    });
  });

  it("should parse inline tasks", async () => {
    const content = `---
title: Spec
---
- [ ] T001: Task 1
- [x] T002: Task 2
- [ ] **T003** [P] [US-1]: Task 3
`;
    const result = await parseSpecFile(content, "001-test");
    expect(result.tasks).toHaveLength(3);
    
    expect(result.tasks[0]).toEqual(expect.objectContaining({
      taskId: "T001",
      status: "pending",
      description: "Task 1",
    }));

    expect(result.tasks[1]).toEqual(expect.objectContaining({
      taskId: "T002",
      status: "complete",
      description: "Task 2",
    }));

    expect(result.tasks[2]).toEqual(expect.objectContaining({
      taskId: "T003",
      status: "pending",
      description: "Task 3",
      isParallelizable: true,
      userStoryRef: "US-1",
    }));
  });
});
