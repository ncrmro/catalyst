import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import matter from "gray-matter";
import { type Node, type Parent } from "unist";
import { type Heading, type ListItem, type Text } from "mdast";

export interface SpecTask {
  id: string;
  userStoryRef?: string;
  description: string;
  isParallelizable: boolean;
  status: "pending" | "in_progress" | "complete";
}

export interface ParsedSpec {
  title: string;
  tasks: SpecTask[];
  frontmatter: Record<string, unknown>;
}

/**
 * Parses a tasks.md file and extracts task information.
 */
export async function parseSpecTasks(content: string): Promise<SpecTask[]> {
  const { content: markdown } = matter(content);
  const processor = unified().use(remarkParse).use(remarkGfm);
  const ast = processor.parse(markdown);

  const tasks: SpecTask[] = [];

  // Traverse AST to find list items that look like tasks: - [ ] T001 [P] [US-1] Description
  const visit = (node: Node) => {
    if (node.type === "listItem") {
      const listItem = node as ListItem;
      if (typeof listItem.checked === "boolean") {
        // This is a task list item
        const textContent = extractText(listItem);
        const task = parseTaskLine(textContent, listItem.checked);
        if (task) {
          tasks.push(task);
        }
      }
    }

    if ("children" in node) {
      (node as Parent).children.forEach(visit);
    }
  };

  visit(ast);
  return tasks;
}

function extractText(node: Node): string {
  if (node.type === "text") {
    return (node as Text).value;
  }
  if ("children" in node) {
    return (node as Parent).children.map(extractText).join("");
  }
  return "";
}

function parseTaskLine(line: string, isChecked: boolean): SpecTask | null {
  // Regex to match: T001 [P] [US-1] Description
  // Or: T001 [US-1] Description
  // Or: T001 Description
  const taskRegex = /^(T\d+)\s*(?:\[(P)\])?\s*(?:\[(US-\d+)\])?\s*(.*)$/;
  const match = line.trim().match(taskRegex);

  if (!match) return null;

  const [_, id, parallel, usRef, description] = match;

  return {
    id,
    userStoryRef: usRef || undefined,
    description: description.trim(),
    isParallelizable: !!parallel,
    status: isChecked ? "complete" : "pending",
  };
}

/**
 * Parses a spec.md file and extracts frontmatter and title.
 */
export async function parseSpec(content: string): Promise<ParsedSpec> {
  const { data: frontmatter, content: markdown } = matter(content);
  const processor = unified().use(remarkParse).use(remarkGfm);
  const ast = processor.parse(markdown);

  let title = "";
  const visit = (node: Node) => {
    if (node.type === "heading") {
      const heading = node as Heading;
      if (heading.depth === 1 && !title) {
        title = extractText(heading);
      }
    }
    if ("children" in node) {
      (node as Parent).children.forEach(visit);
    }
  };

  visit(ast);

  return {
    title: title.replace(/^Feature Specification:\s*/, "").trim(),
    tasks: [], // Tasks are usually in a separate file, but could be merged
    frontmatter,
  };
}
