/**
 * Type aliases for semantic clarity.
 * All IDs are UUIDv7 strings (time-sortable).
 */

/** Thread container ID */
export type ThreadId = string;

/** Item (message/event) ID */
export type ItemId = string;

/** Agent run ID - groups items into a single execution */
export type RunId = string;

/** Span ID - groups items into a DAG node */
export type SpanId = string;

/** Stream ID - for resumable streaming */
export type StreamId = string;

/** Request ID - traceability back to HTTP request */
export type RequestId = string;

/** Correlation ID - for tool call/result pairing */
export type CorrelationId = string;

/** Edge ID - for DAG dependencies */
export type EdgeId = string;

/** Project ID - tenant isolation */
export type ProjectId = string;
