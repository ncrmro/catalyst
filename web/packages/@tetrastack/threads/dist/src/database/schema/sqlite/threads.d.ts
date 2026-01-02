/**
 * SQLite schema for threads persistence layer.
 * Uses factory pattern for generic metadata support.
 */
import type { MessagePart } from '../../../types';
/**
 * Factory function to create thread tables with custom metadata types.
 * @example
 * ```typescript
 * type ThreadMeta = { workflowType: string; priority: number };
 * type ItemMeta = { confidence: number; model: string };
 * const { threads, items, edges, streams } = createThreadTables<ThreadMeta, ItemMeta>();
 * ```
 */
export declare const createThreadTables: <TThreadMetadata extends Record<string, unknown> = Record<string, unknown>, TItemMetadata extends Record<string, unknown> = Record<string, unknown>>() => {
    threads: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
        name: "threads";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "id";
                tableName: "threads";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: true;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            projectId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "project_id";
                tableName: "threads";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            scopeType: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "scope_type";
                tableName: "threads";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            scopeId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "scope_id";
                tableName: "threads";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            title: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "title";
                tableName: "threads";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            metadata: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "metadata";
                tableName: "threads";
                dataType: "json";
                columnType: "SQLiteTextJson";
                data: TThreadMetadata;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                $type: TThreadMetadata;
            }>;
            createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "created_at";
                tableName: "threads";
                dataType: "date";
                columnType: "SQLiteTimestamp";
                data: Date;
                driverParam: number;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "updated_at";
                tableName: "threads";
                dataType: "date";
                columnType: "SQLiteTimestamp";
                data: Date;
                driverParam: number;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "sqlite";
    }>;
    items: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
        name: "items";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "id";
                tableName: "items";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: true;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "thread_id";
                tableName: "items";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            role: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "role";
                tableName: "items";
                dataType: "string";
                columnType: "SQLiteText";
                data: "user" | "assistant" | "system" | "tool";
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: ["user", "assistant", "system", "tool"];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            parts: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "parts";
                tableName: "items";
                dataType: "json";
                columnType: "SQLiteTextJson";
                data: MessagePart[];
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                $type: MessagePart[];
            }>;
            runId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "run_id";
                tableName: "items";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            spanId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "span_id";
                tableName: "items";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            parentId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "parent_id";
                tableName: "items";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            visibility: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "visibility";
                tableName: "items";
                dataType: "string";
                columnType: "SQLiteText";
                data: "visible" | "hidden" | "archived";
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: ["visible", "hidden", "archived"];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            attempt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "attempt";
                tableName: "items";
                dataType: "number";
                columnType: "SQLiteInteger";
                data: number;
                driverParam: number;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            requestId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "request_id";
                tableName: "items";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            metadata: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "metadata";
                tableName: "items";
                dataType: "json";
                columnType: "SQLiteTextJson";
                data: TItemMetadata;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                $type: TItemMetadata;
            }>;
            createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "created_at";
                tableName: "items";
                dataType: "date";
                columnType: "SQLiteTimestamp";
                data: Date;
                driverParam: number;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "sqlite";
    }>;
    edges: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
        name: "edges";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "id";
                tableName: "edges";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: true;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "thread_id";
                tableName: "edges";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            fromItemId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "from_item_id";
                tableName: "edges";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            toItemId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "to_item_id";
                tableName: "edges";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            type: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "type";
                tableName: "edges";
                dataType: "string";
                columnType: "SQLiteText";
                data: "depends_on" | "caused_by";
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: ["depends_on", "caused_by"];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            requestId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "request_id";
                tableName: "edges";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "created_at";
                tableName: "edges";
                dataType: "date";
                columnType: "SQLiteTimestamp";
                data: Date;
                driverParam: number;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "sqlite";
    }>;
    streams: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
        name: "streams";
        schema: undefined;
        columns: {
            id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "id";
                tableName: "streams";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: true;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "thread_id";
                tableName: "streams";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: true;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            runId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "run_id";
                tableName: "streams";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            status: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "status";
                tableName: "streams";
                dataType: "string";
                columnType: "SQLiteText";
                data: "active" | "completed" | "aborted" | "expired";
                driverParam: string;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: ["active", "completed", "aborted", "expired"];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            resumeToken: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "resume_token";
                tableName: "streams";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            lastEventId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "last_event_id";
                tableName: "streams";
                dataType: "string";
                columnType: "SQLiteText";
                data: string;
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: [string, ...string[]];
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                length: number | undefined;
            }>;
            snapshot: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "snapshot";
                tableName: "streams";
                dataType: "json";
                columnType: "SQLiteTextJson";
                data: {
                    parts: MessagePart[];
                    metadata?: Record<string, unknown>;
                };
                driverParam: string;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {
                $type: {
                    parts: MessagePart[];
                    metadata?: Record<string, unknown>;
                };
            }>;
            expiresAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "expires_at";
                tableName: "streams";
                dataType: "date";
                columnType: "SQLiteTimestamp";
                data: Date;
                driverParam: number;
                notNull: false;
                hasDefault: false;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: false;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "created_at";
                tableName: "streams";
                dataType: "date";
                columnType: "SQLiteTimestamp";
                data: Date;
                driverParam: number;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
            updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
                name: "updated_at";
                tableName: "streams";
                dataType: "date";
                columnType: "SQLiteTimestamp";
                data: Date;
                driverParam: number;
                notNull: true;
                hasDefault: true;
                isPrimaryKey: false;
                isAutoincrement: false;
                hasRuntimeDefault: true;
                enumValues: undefined;
                baseColumn: never;
                identity: undefined;
                generated: undefined;
            }, {}, {}>;
        };
        dialect: "sqlite";
    }>;
};
export declare const threads: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "threads";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "threads";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        projectId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "project_id";
            tableName: "threads";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        scopeType: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "scope_type";
            tableName: "threads";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        scopeId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "scope_id";
            tableName: "threads";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        title: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "title";
            tableName: "threads";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        metadata: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "metadata";
            tableName: "threads";
            dataType: "json";
            columnType: "SQLiteTextJson";
            data: Record<string, unknown>;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: Record<string, unknown>;
        }>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "threads";
            dataType: "date";
            columnType: "SQLiteTimestamp";
            data: Date;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "updated_at";
            tableName: "threads";
            dataType: "date";
            columnType: "SQLiteTimestamp";
            data: Date;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "sqlite";
}>, items: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "items";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "items";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "thread_id";
            tableName: "items";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        role: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "role";
            tableName: "items";
            dataType: "string";
            columnType: "SQLiteText";
            data: "user" | "assistant" | "system" | "tool";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["user", "assistant", "system", "tool"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        parts: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "parts";
            tableName: "items";
            dataType: "json";
            columnType: "SQLiteTextJson";
            data: MessagePart[];
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: MessagePart[];
        }>;
        runId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "run_id";
            tableName: "items";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        spanId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "span_id";
            tableName: "items";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        parentId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "parent_id";
            tableName: "items";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        visibility: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "visibility";
            tableName: "items";
            dataType: "string";
            columnType: "SQLiteText";
            data: "visible" | "hidden" | "archived";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["visible", "hidden", "archived"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        attempt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "attempt";
            tableName: "items";
            dataType: "number";
            columnType: "SQLiteInteger";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        requestId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "request_id";
            tableName: "items";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        metadata: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "metadata";
            tableName: "items";
            dataType: "json";
            columnType: "SQLiteTextJson";
            data: Record<string, unknown>;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: Record<string, unknown>;
        }>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "items";
            dataType: "date";
            columnType: "SQLiteTimestamp";
            data: Date;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "sqlite";
}>, edges: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "edges";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "edges";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "thread_id";
            tableName: "edges";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        fromItemId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "from_item_id";
            tableName: "edges";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        toItemId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "to_item_id";
            tableName: "edges";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        type: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "type";
            tableName: "edges";
            dataType: "string";
            columnType: "SQLiteText";
            data: "depends_on" | "caused_by";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["depends_on", "caused_by"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        requestId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "request_id";
            tableName: "edges";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "edges";
            dataType: "date";
            columnType: "SQLiteTimestamp";
            data: Date;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "sqlite";
}>, streams: import("drizzle-orm/sqlite-core").SQLiteTableWithColumns<{
    name: "streams";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "id";
            tableName: "streams";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "thread_id";
            tableName: "streams";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        runId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "run_id";
            tableName: "streams";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        status: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "status";
            tableName: "streams";
            dataType: "string";
            columnType: "SQLiteText";
            data: "active" | "completed" | "aborted" | "expired";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["active", "completed", "aborted", "expired"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        resumeToken: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "resume_token";
            tableName: "streams";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        lastEventId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "last_event_id";
            tableName: "streams";
            dataType: "string";
            columnType: "SQLiteText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            length: number | undefined;
        }>;
        snapshot: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "snapshot";
            tableName: "streams";
            dataType: "json";
            columnType: "SQLiteTextJson";
            data: {
                parts: MessagePart[];
                metadata?: Record<string, unknown>;
            };
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: {
                parts: MessagePart[];
                metadata?: Record<string, unknown>;
            };
        }>;
        expiresAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "expires_at";
            tableName: "streams";
            dataType: "date";
            columnType: "SQLiteTimestamp";
            data: Date;
            driverParam: number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "created_at";
            tableName: "streams";
            dataType: "date";
            columnType: "SQLiteTimestamp";
            data: Date;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
            name: "updated_at";
            tableName: "streams";
            dataType: "date";
            columnType: "SQLiteTimestamp";
            data: Date;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "sqlite";
}>;
export declare const insertThreadSchema: import("drizzle-zod").BuildSchema<"insert", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    projectId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "project_id";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    scopeType: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "scope_type";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    scopeId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "scope_id";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    title: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "title";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    metadata: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "metadata";
        tableName: "threads";
        dataType: "json";
        columnType: "SQLiteTextJson";
        data: Record<string, unknown>;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        $type: Record<string, unknown>;
    }>;
    createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "created_at";
        tableName: "threads";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "updated_at";
        tableName: "threads";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
}, undefined, undefined>;
export declare const selectThreadSchema: import("drizzle-zod").BuildSchema<"select", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    projectId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "project_id";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    scopeType: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "scope_type";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    scopeId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "scope_id";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    title: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "title";
        tableName: "threads";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    metadata: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "metadata";
        tableName: "threads";
        dataType: "json";
        columnType: "SQLiteTextJson";
        data: Record<string, unknown>;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        $type: Record<string, unknown>;
    }>;
    createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "created_at";
        tableName: "threads";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "updated_at";
        tableName: "threads";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
}, undefined, undefined>;
export declare const insertItemSchema: import("drizzle-zod").BuildSchema<"insert", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "thread_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    role: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "role";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: "user" | "assistant" | "system" | "tool";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["user", "assistant", "system", "tool"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    parts: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "parts";
        tableName: "items";
        dataType: "json";
        columnType: "SQLiteTextJson";
        data: MessagePart[];
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        $type: MessagePart[];
    }>;
    runId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "run_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    spanId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "span_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    parentId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "parent_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    visibility: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "visibility";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: "visible" | "hidden" | "archived";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["visible", "hidden", "archived"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    attempt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "attempt";
        tableName: "items";
        dataType: "number";
        columnType: "SQLiteInteger";
        data: number;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    requestId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "request_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    metadata: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "metadata";
        tableName: "items";
        dataType: "json";
        columnType: "SQLiteTextJson";
        data: Record<string, unknown>;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        $type: Record<string, unknown>;
    }>;
    createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "created_at";
        tableName: "items";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
}, undefined, undefined>;
export declare const selectItemSchema: import("drizzle-zod").BuildSchema<"select", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "thread_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    role: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "role";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: "user" | "assistant" | "system" | "tool";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["user", "assistant", "system", "tool"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    parts: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "parts";
        tableName: "items";
        dataType: "json";
        columnType: "SQLiteTextJson";
        data: MessagePart[];
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        $type: MessagePart[];
    }>;
    runId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "run_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    spanId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "span_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    parentId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "parent_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    visibility: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "visibility";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: "visible" | "hidden" | "archived";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["visible", "hidden", "archived"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    attempt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "attempt";
        tableName: "items";
        dataType: "number";
        columnType: "SQLiteInteger";
        data: number;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    requestId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "request_id";
        tableName: "items";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    metadata: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "metadata";
        tableName: "items";
        dataType: "json";
        columnType: "SQLiteTextJson";
        data: Record<string, unknown>;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        $type: Record<string, unknown>;
    }>;
    createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "created_at";
        tableName: "items";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
}, undefined, undefined>;
export declare const insertEdgeSchema: import("drizzle-zod").BuildSchema<"insert", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "thread_id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    fromItemId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "from_item_id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    toItemId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "to_item_id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    type: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "type";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: "depends_on" | "caused_by";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["depends_on", "caused_by"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    requestId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "request_id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "created_at";
        tableName: "edges";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
}, undefined, undefined>;
export declare const selectEdgeSchema: import("drizzle-zod").BuildSchema<"select", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "thread_id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    fromItemId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "from_item_id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    toItemId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "to_item_id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    type: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "type";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: "depends_on" | "caused_by";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["depends_on", "caused_by"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    requestId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "request_id";
        tableName: "edges";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "created_at";
        tableName: "edges";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
}, undefined, undefined>;
export declare const insertStreamSchema: import("drizzle-zod").BuildSchema<"insert", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "thread_id";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    runId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "run_id";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    status: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "status";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: "active" | "completed" | "aborted" | "expired";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["active", "completed", "aborted", "expired"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    resumeToken: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "resume_token";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    lastEventId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "last_event_id";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    snapshot: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "snapshot";
        tableName: "streams";
        dataType: "json";
        columnType: "SQLiteTextJson";
        data: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        };
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        $type: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        };
    }>;
    expiresAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "expires_at";
        tableName: "streams";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "created_at";
        tableName: "streams";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "updated_at";
        tableName: "streams";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
}, undefined, undefined>;
export declare const selectStreamSchema: import("drizzle-zod").BuildSchema<"select", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    threadId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "thread_id";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    runId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "run_id";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    status: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "status";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: "active" | "completed" | "aborted" | "expired";
        driverParam: string;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: ["active", "completed", "aborted", "expired"];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    resumeToken: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "resume_token";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    lastEventId: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "last_event_id";
        tableName: "streams";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
    snapshot: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "snapshot";
        tableName: "streams";
        dataType: "json";
        columnType: "SQLiteTextJson";
        data: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        };
        driverParam: string;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        $type: {
            parts: MessagePart[];
            metadata?: Record<string, unknown>;
        };
    }>;
    expiresAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "expires_at";
        tableName: "streams";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: false;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    createdAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "created_at";
        tableName: "streams";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    updatedAt: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "updated_at";
        tableName: "streams";
        dataType: "date";
        columnType: "SQLiteTimestamp";
        data: Date;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: true;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
}, undefined, undefined>;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Edge = typeof edges.$inferSelect;
export type NewEdge = typeof edges.$inferInsert;
export type Stream = typeof streams.$inferSelect;
export type NewStream = typeof streams.$inferInsert;
//# sourceMappingURL=threads.d.ts.map