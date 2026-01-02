"use server";

/**
 * Server actions for fetching project specifications from repository
 */

import { fetchProjectById } from "@/actions/projects";
import { listDirectory, readFile } from "@/actions/version-control-provider";
import { updateFile } from "@/actions/vcs";
import type { Spec } from "@/lib/pr-spec-matching";
import { parseSpecFile } from "@/lib/spec-parser";
import { createSpecFolder, syncSpecTasksToDb, updateSpecFolder, getSpecBySlug, updateSpecTaskStatus, type NewSpecTask } from "@/models/specs";
import { db } from "@/db";
import { specTasks, specFolders } from "@/db/schema/specs";
import { eq, and } from "drizzle-orm";

/**
 * Fetch specs for a project from its repository's specs/ directory
 *
 * @param projectId - The project ID
 * @param projectSlug - The project slug (for building href)
 * @returns Array of specs with id, name, and href
 */
export async function fetchProjectSpecs(
  projectId: string,
  projectSlug: string,
): Promise<Spec[]> {
  const project = await fetchProjectById(projectId);
  if (!project) return [];

  const repo = project.repositories[0]?.repo;
  if (!repo) return [];

  const specsResult = await listDirectory(repo.fullName, "specs");
  if (!specsResult.success) return [];

  // Filter to only directories that start with 3 digits (e.g., 001-feature, 009-projects)
  // This excludes non-spec directories like .templates
  const specPattern = /^\d{3}-/;
  const specDirs = specsResult.entries.filter(
    (e) => e.type === "dir" && specPattern.test(e.name),
  );

  return specDirs.map((dir) => ({
    id: dir.name,
    name: dir.name,
    href: `/projects/${projectSlug}/spec/${dir.name}`,
  }));
}

/**
 * Update a spec file content
 */
export async function updateSpec(
  projectId: string,
  specPath: string,
  content: string,
  message: string = "docs: update spec",
) {
  const project = await fetchProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const repo = project.repositories[0]?.repo;
  if (!repo) throw new Error("Project repository not found");

  const [owner, repoName] = repo.fullName.split("/");

  return await updateFile({
    owner,
    repo: repoName,
    path: specPath,
    content,
    message,
    branch: repo.defaultBranch || "main",
  });
}

/**
 * Create a new spec folder and initial spec.md file
 */
export async function createSpec(
  projectId: string,
  specName: string,
  initialContent: string = "# New Specification\n\n## Summary\n\n",
) {
  const project = await fetchProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const repo = project.repositories[0]?.repo;
  if (!repo) throw new Error("Project repository not found");

  const [owner, repoName] = repo.fullName.split("/");

  // Path for the new spec.md
  const specPath = `specs/${specName}/spec.md`;

  return await updateFile({
    owner,
    repo: repoName,
    path: specPath,
    content: initialContent,
    message: `docs: create spec ${specName}`,
    branch: repo.defaultBranch || "main",
  });
}

/**
 * Index all spec folders from the repository and sync to database
 */
export async function indexSpecFolders(projectId: string) {
  const project = await fetchProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const repo = project.repositories[0]?.repo;
  if (!repo) throw new Error("Project repository not found");

  const specsResult = await listDirectory(repo.fullName, "specs");
  if (!specsResult.success) return { success: false, error: specsResult.error };

  const specPattern = /^\d{3}-/;
  const specDirs = specsResult.entries.filter(
    (e) => e.type === "dir" && specPattern.test(e.name),
  );

  let indexedCount = 0;

  for (const dir of specDirs) {
    // Check if spec.md exists
    const specFile = await readFile(repo.fullName, `specs/${dir.name}/spec.md`);
    if (!specFile.success || !specFile.file) continue;

    // Parse spec content
    const parsed = await parseSpecFile(specFile.file.content, dir.name);

    // Check if already exists
    const existing = await getSpecBySlug(projectId, dir.name);

    if (existing) {
      await updateSpecFolder(existing.id, {
        title: parsed.metadata.title,
        status: parsed.metadata.status,
        lastSyncedAt: new Date(),
      });
      if (parsed.tasks.length > 0) {
        const tasksToSync: NewSpecTask[] = parsed.tasks.map(t => ({
          taskId: t.taskId!,
          description: t.description!,
          status: t.status!,
          isParallelizable: t.isParallelizable || false,
          userStoryRef: t.userStoryRef || null,
          specFolderId: existing.id,
        }));
        await syncSpecTasksToDb(existing.id, tasksToSync);
      }
    } else {
      const newSpec = await createSpecFolder({
        projectId,
        slug: dir.name,
        specNumber: parsed.metadata.specNumber,
        title: parsed.metadata.title,
        status: parsed.metadata.status,
        lastSyncedAt: new Date(),
      });
      if (parsed.tasks.length > 0) {
        const tasksToSync: NewSpecTask[] = parsed.tasks.map(t => ({
          taskId: t.taskId!,
          description: t.description!,
          status: t.status!,
          isParallelizable: t.isParallelizable || false,
          userStoryRef: t.userStoryRef || null,
          specFolderId: newSpec.id,
        }));
        await syncSpecTasksToDb(newSpec.id, tasksToSync);
      }
    }
    indexedCount++;
  }

  return { success: true, indexedCount };
}

/**
 * Sync tasks for a specific spec folder
 */
export async function syncSpecTasks(projectId: string, specSlug: string) {
  const project = await fetchProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const repo = project.repositories[0]?.repo;
  if (!repo) throw new Error("Project repository not found");

  // Try reading tasks.md first
  let contentResult = await readFile(repo.fullName, `specs/${specSlug}/tasks.md`);
  
  // Fallback to spec.md if tasks.md doesn't exist
  if (!contentResult.success || !contentResult.file) {
    contentResult = await readFile(repo.fullName, `specs/${specSlug}/spec.md`);
  }

  if (!contentResult.success || !contentResult.file) {
    return { success: false, error: "No spec or tasks file found" };
  }

  const parsed = await parseSpecFile(contentResult.file.content, specSlug);
  const spec = await getSpecBySlug(projectId, specSlug);

  if (spec && parsed.tasks.length > 0) {
    const tasksToSync: NewSpecTask[] = parsed.tasks.map(t => ({
      taskId: t.taskId!,
      description: t.description!,
      status: t.status!,
      isParallelizable: t.isParallelizable || false,
      userStoryRef: t.userStoryRef || null,
      specFolderId: spec.id,
    }));
    await syncSpecTasksToDb(spec.id, tasksToSync);
    
    // Update completion percentage
    const completed = parsed.tasks.filter(t => t.status === "complete").length;
    const total = parsed.tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    await updateSpecFolder(spec.id, {
      completionPercentage: percentage,
      lastSyncedAt: new Date(),
    });
  }

  return { success: true, taskCount: parsed.tasks.length };
}

/**
 * Update task status from a PR merge or creation
 */
export async function updateTaskFromPR(
  prNumber: number,
  prTitle: string,
  prBody: string,
  prState: "open" | "closed" | "merged",
  projectId: string
) {
  // Regex to find Task IDs (e.g. T001, T123)
  const taskRegex = /\b(T\d{3})\b/g;
  const matches = new Set([
    ...(prTitle.match(taskRegex) || []),
    ...(prBody?.match(taskRegex) || [])
  ]);

  if (matches.size === 0) return { updated: 0 };

  const tasksToUpdate = Array.from(matches);
  let updatedCount = 0;

  for (const taskId of tasksToUpdate) {
    const relevantTasks = await db
      .select({
        id: specTasks.id,
        status: specTasks.status,
      })
      .from(specTasks)
      .innerJoin(specFolders, eq(specTasks.specFolderId, specFolders.id))
      .where(and(
        eq(specFolders.projectId, projectId),
        eq(specTasks.taskId, taskId)
      ));

    for (const task of relevantTasks) {
      let newStatus = task.status;
      
      if (prState === "merged") {
        newStatus = "complete";
      } else if (prState === "open") {
        newStatus = "in_progress";
      }

      if (newStatus !== task.status) {
        await updateSpecTaskStatus(task.id, newStatus as "pending" | "in_progress" | "complete");
        // Also update the linked PR number
        await db.update(specTasks)
          .set({ linkedPrNumber: prNumber })
          .where(eq(specTasks.id, task.id));
        updatedCount++;
      }
    }
  }

  return { updated: updatedCount };
}
