"use server";

import { auth } from "@/auth";
import {
  getOrCreateThread,
  getThreadById,
  listThreadsByProject,
  listThreadsByScope,
  getThreadItems,
} from "@/models/threads";
import { z } from "zod";

/**
 * Chat Server Actions
 * Server-side functions for managing chat threads and messages.
 */

const CreateThreadSchema = z.object({
  projectId: z.string(),
  scopeType: z.enum(["project", "spec"]),
  scopeId: z.string(),
  title: z.string().optional(),
});

const GetThreadMessagesSchema = z.object({
  threadId: z.string().uuid(),
});

/**
 * Create or get a chat thread
 */
export async function createChatThread(input: z.infer<typeof CreateThreadSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parsed = CreateThreadSchema.parse(input);

  const thread = await getOrCreateThread({
    projectId: parsed.projectId,
    scopeType: parsed.scopeType,
    scopeId: parsed.scopeId,
    title: parsed.title,
  });

  return thread;
}

/**
 * Get messages for a thread
 */
export async function getChatMessages(input: z.infer<typeof GetThreadMessagesSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parsed = GetThreadMessagesSchema.parse(input);
  const items = await getThreadItems(parsed.threadId);

  return items;
}

/**
 * List all threads for a project
 */
export async function listProjectThreads(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // TODO: Verify user has access to the project

  const threads = await listThreadsByProject(projectId);
  return threads;
}

/**
 * Get a specific thread by ID
 */
export async function getChatThread(threadId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const thread = await getThreadById(threadId);
  if (!thread) {
    throw new Error("Thread not found");
  }

  // TODO: Verify user has access to the thread's project

  return thread;
}

/**
 * List threads for a specific scope (project or spec)
 */
export async function listScopedThreads(params: {
  projectId: string;
  scopeType: "project" | "spec";
  scopeId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // TODO: Verify user has access to the project

  const threads = await listThreadsByScope(params);
  return threads;
}
