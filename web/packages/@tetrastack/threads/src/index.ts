/**
 * @tetrastack/threads
 *
 * Universal thread and activity persistence layer.
 *
 * Supports three distinct use cases in a unified schema:
 * 1. Record Feeds: Comments or activity logs attached to any entity
 * 2. Agent Workflows: Structured logs of AI agents executing tasks (DAGs)
 * 3. Chat Interfaces: Traditional conversational UIs (AI SDK compatible)
 *
 * @example
 * ```typescript
 * import { createThreadModels } from '@tetrastack/threads/models';
 * import { sqlite } from '@tetrastack/threads/database';
 *
 * // Create models bound to your database
 * const db = drizzle(sqliteConnection);
 * const models = createThreadModels(db);
 *
 * // Create a thread for a ticket
 * const [thread] = await models.threads.insert([{
 *   projectId: 'proj_123',
 *   scopeType: 'ticket',
 *   scopeId: 'T-101',
 *   title: 'Support Discussion',
 * }]);
 *
 * // Append items
 * await models.items.append({
 *   threadId: thread.id,
 *   role: 'user',
 *   parts: [{ type: 'text', text: 'Hello, I need help.' }],
 *   requestId: 'req_abc',
 * });
 * ```
 */

// Types
export * from './types';

// Re-export commonly used types for convenience
export type {
  Thread,
  NewThread,
  Item,
  NewItem,
  Edge,
  NewEdge,
  Stream,
  NewStream,
} from './models';
