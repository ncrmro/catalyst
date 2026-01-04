import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Thread model integration with Catalyst database.
 * Provides utilities for creating and managing chat threads scoped to projects or specs.
 */

export interface ThreadScope {
  projectId: string;
  scopeType: "project" | "spec";
  scopeId: string; // For project: projectId, For spec: `${projectId}:${specSlug}`
}

export interface CreateThreadParams extends ThreadScope {
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface GetThreadParams extends ThreadScope {}

/**
 * Get or create a thread for a given scope.
 * If a thread exists for the scope, returns it. Otherwise, creates a new one.
 */
export async function getOrCreateThread(params: CreateThreadParams) {
  const { projectId, scopeType, scopeId, title, metadata } = params;

  // Try to find existing thread
  const existing = await db
    .select()
    .from(schema.threads)
    .where(
      and(
        eq(schema.threads.projectId, projectId),
        eq(schema.threads.scopeType, scopeType),
        eq(schema.threads.scopeId, scopeId),
      ),
    )
    .orderBy(desc(schema.threads.createdAt))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new thread
  const [newThread] = await db
    .insert(schema.threads)
    .values({
      projectId,
      scopeType,
      scopeId,
      title: title || `${scopeType} chat`,
      metadata: metadata || {},
    })
    .returning();

  return newThread;
}

/**
 * Get a thread by ID
 */
export async function getThreadById(threadId: string) {
  const [thread] = await db
    .select()
    .from(schema.threads)
    .where(eq(schema.threads.id, threadId))
    .limit(1);

  return thread || null;
}

/**
 * List threads for a project
 */
export async function listThreadsByProject(projectId: string) {
  return db
    .select()
    .from(schema.threads)
    .where(eq(schema.threads.projectId, projectId))
    .orderBy(desc(schema.threads.updatedAt));
}

/**
 * List threads for a specific scope
 */
export async function listThreadsByScope(params: GetThreadParams) {
  const { projectId, scopeType, scopeId } = params;

  return db
    .select()
    .from(schema.threads)
    .where(
      and(
        eq(schema.threads.projectId, projectId),
        eq(schema.threads.scopeType, scopeType),
        eq(schema.threads.scopeId, scopeId),
      ),
    )
    .orderBy(desc(schema.threads.updatedAt));
}

/**
 * Update thread metadata
 */
export async function updateThreadMetadata(
  threadId: string,
  metadata: Record<string, unknown>,
) {
  const [updated] = await db
    .update(schema.threads)
    .set({
      metadata,
      updatedAt: new Date(),
    })
    .where(eq(schema.threads.id, threadId))
    .returning();

  return updated;
}

/**
 * Delete a thread and all its items
 */
export async function deleteThread(threadId: string) {
  await db.delete(schema.threads).where(eq(schema.threads.id, threadId));
}

/**
 * Add an item to a thread
 */
export async function addThreadItem(params: {
  threadId: string;
  role: "user" | "assistant" | "system" | "tool";
  parts: Array<{ type: string; content: string }>;
  requestId: string;
  metadata?: Record<string, unknown>;
  runId?: string;
  spanId?: string;
  parentId?: string;
}) {
  const [item] = await db.insert(schema.items).values(params).returning();
  return item;
}

/**
 * Get items for a thread
 */
export async function getThreadItems(threadId: string) {
  return db
    .select()
    .from(schema.items)
    .where(eq(schema.items.threadId, threadId))
    .orderBy(schema.items.createdAt);
}
