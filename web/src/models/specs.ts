import { db } from "@/db/connection";
import { specFolders, specTasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseSpec, parseSpecTasks } from "@/lib/spec-parser";
import fs from "node:fs/promises";
import path from "node:path";

export interface SpecSyncResult {
  folder: typeof specFolders.$inferSelect;
  tasks: (typeof specTasks.$inferSelect)[];
}

/**
 * Syncs a specific spec folder from the repository to the database.
 * This assumes the files are available on the local filesystem (e.g. in a worktree).
 */
export async function syncSpecFolder(
  projectId: string,
  specDirPath: string
): Promise<SpecSyncResult> {
  const slug = path.basename(specDirPath);
  const specNumber = parseInt(slug.split("-")[0], 10);

  const specContent = await fs.readFile(path.join(specDirPath, "spec.md"), "utf-8");
  const tasksContent = await fs.readFile(path.join(specDirPath, "tasks.md"), "utf-8");

  const parsedSpec = await parseSpec(specContent);
  const parsedTasks = await parseSpecTasks(tasksContent);

  // 1. Upsert Spec Folder
  const [folder] = await db
    .insert(specFolders)
    .values({
      projectId,
      slug,
      specNumber,
      title: parsedSpec.title,
      status: (parsedSpec.frontmatter.status as string) || "draft",
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [specFolders.projectId, specFolders.slug],
      set: {
        title: parsedSpec.title,
        status: (parsedSpec.frontmatter.status as string) || "draft",
        lastSyncedAt: new Date(),
      },
    })
    .returning();

  // 2. Sync Tasks
  // For simplicity, we'll delete and re-insert tasks for this spec folder
  // In a real app, we might want to preserve status if it was manually overridden
  await db.delete(specTasks).where(eq(specTasks.specFolderId, folder.id));

  const tasks = await db
    .insert(specTasks)
    .values(
      parsedTasks.map((t) => ({
        specFolderId: folder.id,
        taskId: t.id,
        userStoryRef: t.userStoryRef,
        description: t.description,
        isParallelizable: t.isParallelizable,
        status: t.status,
      }))
    )
    .returning();

  // 3. Update completion percentage
  const completeCount = tasks.filter((t) => t.status === "complete").length;
  const percentage = tasks.length > 0 ? Math.round((completeCount / tasks.length) * 100) : 0;

  await db
    .update(specFolders)
    .set({ completionPercentage: percentage })
    .where(eq(specFolders.id, folder.id));

  folder.completionPercentage = percentage;

  return { folder, tasks };
}
