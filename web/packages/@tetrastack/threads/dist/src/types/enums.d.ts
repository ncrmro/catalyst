/**
 * Enum constants for thread schema.
 */
/** Message roles */
export declare const ROLES: {
    readonly USER: "user";
    readonly ASSISTANT: "assistant";
    readonly SYSTEM: "system";
    readonly TOOL: "tool";
};
export type Role = (typeof ROLES)[keyof typeof ROLES];
/** Item visibility states */
export declare const VISIBILITY: {
    /** Visible in UI and LLM context */
    readonly VISIBLE: "visible";
    /** Hidden from UI but in LLM context */
    readonly HIDDEN: "hidden";
    /** Excluded from both UI and LLM context */
    readonly ARCHIVED: "archived";
};
export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];
/** Edge types for DAG dependencies */
export declare const EDGE_TYPES: {
    /** This item depends on another */
    readonly DEPENDS_ON: "depends_on";
    /** This item was caused by another */
    readonly CAUSED_BY: "caused_by";
};
export type EdgeType = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES];
/** Stream statuses */
export declare const STREAM_STATUSES: {
    /** Actively streaming */
    readonly ACTIVE: "active";
    /** Successfully completed */
    readonly COMPLETED: "completed";
    /** Aborted by user/system */
    readonly ABORTED: "aborted";
    /** Expired due to timeout */
    readonly EXPIRED: "expired";
};
export type StreamStatus = (typeof STREAM_STATUSES)[keyof typeof STREAM_STATUSES];
//# sourceMappingURL=enums.d.ts.map