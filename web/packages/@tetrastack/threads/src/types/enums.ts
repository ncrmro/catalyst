/**
 * Enum constants for thread schema.
 */

/** Message roles */
export const ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Item visibility states */
export const VISIBILITY = {
  /** Visible in UI and LLM context */
  VISIBLE: 'visible',
  /** Hidden from UI but in LLM context */
  HIDDEN: 'hidden',
  /** Excluded from both UI and LLM context */
  ARCHIVED: 'archived',
} as const;

export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];

/** Edge types for DAG dependencies */
export const EDGE_TYPES = {
  /** This item depends on another */
  DEPENDS_ON: 'depends_on',
  /** This item was caused by another */
  CAUSED_BY: 'caused_by',
} as const;

export type EdgeType = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES];

/** Stream statuses */
export const STREAM_STATUSES = {
  /** Actively streaming */
  ACTIVE: 'active',
  /** Successfully completed */
  COMPLETED: 'completed',
  /** Aborted by user/system */
  ABORTED: 'aborted',
  /** Expired due to timeout */
  EXPIRED: 'expired',
} as const;

export type StreamStatus =
  (typeof STREAM_STATUSES)[keyof typeof STREAM_STATUSES];
