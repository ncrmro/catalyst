import { db } from "@/db";
import { specFolders, specTasks } from "@/db/schema/specs";
import { eq, and } from "drizzle-orm";

export type SpecFolder = typeof specFolders.$inferSelect;
export type NewSpecFolder = typeof specFolders.$inferInsert;
export type SpecTask = typeof specTasks.$inferSelect;
export type NewSpecTask = typeof specTasks.$inferInsert;

export async function getProjectSpecs(projectId: string) {
  return await db.query.specFolders.findMany({
    where: eq(specFolders.projectId, projectId),
    orderBy: (specs, { asc }) => [asc(specs.specNumber)],
    with: {
      tasks: true,
    },
  });
}

export async function getSpecBySlug(projectId: string, slug: string) {
  return await db.query.specFolders.findFirst({
    where: and(eq(specFolders.projectId, projectId), eq(specFolders.slug, slug)),
    with: {
      tasks: true,
    },
  });
}

export async function createSpecFolder(spec: NewSpecFolder) {
  const [created] = await db.insert(specFolders).values(spec).returning();
  return created;
}

export async function updateSpecFolder(id: string, updates: Partial<SpecFolder>) {
  const [updated] = await db
    .update(specFolders)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(specFolders.id, id))
    .returning();
  return updated;
}

export async function syncSpecTasksToDb(specFolderId: string, tasks: NewSpecTask[]) {
  // Use transaction to replace tasks
  await db.transaction(async (tx) => {
    // 1. Delete existing tasks for this spec
    await tx.delete(specTasks).where(eq(specTasks.specFolderId, specFolderId));

    // 2. Insert new tasks
    if (tasks.length > 0) {
      await tx.insert(specTasks).values(tasks);
    }
  });
}

export async function updateSpecTaskStatus(taskId: string, status: SpecTask["status"]) {
  const [updated] = await db
    .update(specTasks)
    .set({ status, updatedAt: new Date() })
    .where(eq(specTasks.id, taskId))
    .returning();
  return updated;
}
