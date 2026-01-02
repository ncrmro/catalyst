import matter from "gray-matter";
import type { SpecTask } from "@/db/schema/specs";

export interface ParsedSpec {
  metadata: {
    title: string;
    status: "draft" | "active" | "complete";
    specNumber: number;
    slug: string;
  };
  content: string;
  tasks: Partial<SpecTask>[];
}

/**
 * Parse a spec markdown file to extract metadata and tasks
 *
 * @param content - The markdown content
 * @param slug - The spec slug (e.g., '001-user-auth')
 */
export async function parseSpecFile(content: string, slug: string): Promise<ParsedSpec> {
  // 1. Parse frontmatter
  const { data, content: body } = matter(content);

  // 2. Parse tasks from markdown body
  // We look for checklist items like "- [ ] T001: Description"
  const tasks: Partial<SpecTask>[] = [];
  
  // Regex to match tasks: - [ ] **ID** [P?] [Ref?] Description
  // Examples:
  // - [ ] **T001**: Initialize project
  // - [x] **T002** [P]: Parallel task
  // - [ ] **T003** [US-1]: User story ref
  const taskRegex = /-\s+\[([ x])\]\s+(?:\*\*)?(T\d+)(?:\*\*)?(?:\s+\[(P)\])?(?:\s+\[([A-Z]+-\d+)\])?[:\s]+(.*)/gm;

  let match;
  while ((match = taskRegex.exec(body)) !== null) {
    const [_, checked, taskId, parallelFlag, userStoryRef, description] = match;
    
    tasks.push({
      taskId,
      status: checked === "x" ? "complete" : "pending",
      isParallelizable: parallelFlag === "P",
      userStoryRef: userStoryRef || null,
      description: description.trim(),
    });
  }

  // 3. Extract spec number from slug
  const specNumberMatch = slug.match(/^(\d+)-/);
  const specNumber = specNumberMatch ? parseInt(specNumberMatch[1], 10) : 0;

  return {
    metadata: {
      title: data.title || slug,
      status: (data.status as "draft" | "active" | "complete") || "draft",
      specNumber,
      slug,
    },
    content: body,
    tasks,
  };
}
