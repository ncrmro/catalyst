/**
 * Tests for Common Kubernetes Zod schemas
 */

import { describe, it, expect } from "vitest";
import {
  OwnerReferenceSchema,
  ObjectMetaSchema,
  ConditionSchema,
  ListMetaSchema,
  WatchEventTypeSchema,
  createWatchEventSchema,
  WatchOptionsSchema,
  ListOptionsSchema,
} from "./common.zod";

describe("Common Kubernetes Zod Schemas", () => {
  describe("OwnerReferenceSchema", () => {
    it("should validate a valid owner reference", () => {
      const valid = {
        apiVersion: "apps/v1",
        kind: "Deployment",
        name: "my-deployment",
        uid: "123-456",
      };
      expect(() => OwnerReferenceSchema.parse(valid)).not.toThrow();
    });

    it("should validate owner reference with optional fields", () => {
      const valid = {
        apiVersion: "apps/v1",
        kind: "Deployment",
        name: "my-deployment",
        uid: "123-456",
        controller: true,
        blockOwnerDeletion: false,
      };
      expect(() => OwnerReferenceSchema.parse(valid)).not.toThrow();
    });

    it("should reject owner reference without required fields", () => {
      const invalid = {
        apiVersion: "apps/v1",
        kind: "Deployment",
      };
      expect(() => OwnerReferenceSchema.parse(invalid)).toThrow();
    });
  });

  describe("ObjectMetaSchema", () => {
    it("should validate minimal object metadata", () => {
      const valid = {
        name: "my-resource",
      };
      expect(() => ObjectMetaSchema.parse(valid)).not.toThrow();
    });

    it("should validate full object metadata", () => {
      const valid = {
        name: "my-resource",
        namespace: "default",
        uid: "123-456",
        resourceVersion: "1000",
        creationTimestamp: "2024-01-01T00:00:00Z",
        deletionTimestamp: "2024-01-02T00:00:00Z",
        labels: {
          app: "myapp",
          env: "prod",
        },
        annotations: {
          "kubectl.kubernetes.io/last-applied-configuration": "{}",
        },
        finalizers: ["kubernetes.io/pvc-protection"],
        ownerReferences: [
          {
            apiVersion: "apps/v1",
            kind: "Deployment",
            name: "parent",
            uid: "789",
          },
        ],
      };
      expect(() => ObjectMetaSchema.parse(valid)).not.toThrow();
    });

    it("should reject metadata without name", () => {
      const invalid = {
        namespace: "default",
      };
      expect(() => ObjectMetaSchema.parse(invalid)).toThrow();
    });

    it("should validate empty labels and annotations", () => {
      const valid = {
        name: "my-resource",
        labels: {},
        annotations: {},
      };
      expect(() => ObjectMetaSchema.parse(valid)).not.toThrow();
    });
  });

  describe("ConditionSchema", () => {
    it("should validate minimal condition", () => {
      const valid = {
        type: "Ready",
        status: "True",
      };
      expect(() => ConditionSchema.parse(valid)).not.toThrow();
    });

    it("should validate full condition", () => {
      const valid = {
        type: "Available",
        status: "False",
        lastTransitionTime: "2024-01-01T00:00:00Z",
        reason: "MinimumReplicasUnavailable",
        message: "Deployment does not have minimum availability",
        observedGeneration: 5,
      };
      expect(() => ConditionSchema.parse(valid)).not.toThrow();
    });

    it("should validate all status values", () => {
      expect(() =>
        ConditionSchema.parse({ type: "Ready", status: "True" }),
      ).not.toThrow();
      expect(() =>
        ConditionSchema.parse({ type: "Ready", status: "False" }),
      ).not.toThrow();
      expect(() =>
        ConditionSchema.parse({ type: "Ready", status: "Unknown" }),
      ).not.toThrow();
    });

    it("should reject invalid status", () => {
      const invalid = {
        type: "Ready",
        status: "Invalid",
      };
      expect(() => ConditionSchema.parse(invalid)).toThrow();
    });

    it("should reject condition without type or status", () => {
      expect(() => ConditionSchema.parse({ type: "Ready" })).toThrow();
      expect(() => ConditionSchema.parse({ status: "True" })).toThrow();
    });
  });

  describe("ListMetaSchema", () => {
    it("should validate empty list metadata", () => {
      const valid = {};
      expect(() => ListMetaSchema.parse(valid)).not.toThrow();
    });

    it("should validate full list metadata", () => {
      const valid = {
        resourceVersion: "1000",
        continue: "continue-token",
        remainingItemCount: 42,
      };
      expect(() => ListMetaSchema.parse(valid)).not.toThrow();
    });

    it("should accept only some fields", () => {
      expect(() =>
        ListMetaSchema.parse({ resourceVersion: "1000" }),
      ).not.toThrow();
      expect(() =>
        ListMetaSchema.parse({ remainingItemCount: 10 }),
      ).not.toThrow();
    });
  });

  describe("WatchEventTypeSchema", () => {
    it("should validate all watch event types", () => {
      expect(() => WatchEventTypeSchema.parse("ADDED")).not.toThrow();
      expect(() => WatchEventTypeSchema.parse("MODIFIED")).not.toThrow();
      expect(() => WatchEventTypeSchema.parse("DELETED")).not.toThrow();
      expect(() => WatchEventTypeSchema.parse("BOOKMARK")).not.toThrow();
    });

    it("should reject invalid event type", () => {
      expect(() => WatchEventTypeSchema.parse("INVALID")).toThrow();
      expect(() => WatchEventTypeSchema.parse("added")).toThrow();
    });
  });

  describe("createWatchEventSchema", () => {
    const TestObjectSchema = ObjectMetaSchema;
    const WatchEventSchema = createWatchEventSchema(TestObjectSchema);

    it("should validate watch event with correct object", () => {
      const valid = {
        type: "ADDED",
        object: {
          name: "my-resource",
        },
      };
      expect(() => WatchEventSchema.parse(valid)).not.toThrow();
    });

    it("should validate all event types", () => {
      const baseEvent = {
        object: { name: "resource" },
      };
      expect(() =>
        WatchEventSchema.parse({ ...baseEvent, type: "ADDED" }),
      ).not.toThrow();
      expect(() =>
        WatchEventSchema.parse({ ...baseEvent, type: "MODIFIED" }),
      ).not.toThrow();
      expect(() =>
        WatchEventSchema.parse({ ...baseEvent, type: "DELETED" }),
      ).not.toThrow();
      expect(() =>
        WatchEventSchema.parse({ ...baseEvent, type: "BOOKMARK" }),
      ).not.toThrow();
    });

    it("should reject invalid object", () => {
      const invalid = {
        type: "ADDED",
        object: { invalid: "missing name field" },
      };
      expect(() => WatchEventSchema.parse(invalid)).toThrow();
    });

    it("should reject missing fields", () => {
      expect(() =>
        WatchEventSchema.parse({ type: "ADDED" }),
      ).toThrow();
      expect(() =>
        WatchEventSchema.parse({ object: { name: "test" } }),
      ).toThrow();
    });
  });

  describe("WatchOptionsSchema", () => {
    it("should validate empty watch options", () => {
      const valid = {};
      expect(() => WatchOptionsSchema.parse(valid)).not.toThrow();
    });

    it("should validate full watch options", () => {
      const valid = {
        namespace: "default",
        labelSelector: "app=myapp",
        fieldSelector: "status.phase=Running",
        resourceVersion: "1000",
        timeoutSeconds: 60,
      };
      expect(() => WatchOptionsSchema.parse(valid)).not.toThrow();
    });

    it("should validate partial watch options", () => {
      expect(() =>
        WatchOptionsSchema.parse({ namespace: "default" }),
      ).not.toThrow();
      expect(() =>
        WatchOptionsSchema.parse({ labelSelector: "app=myapp" }),
      ).not.toThrow();
    });

    it("should reject invalid timeout type", () => {
      const invalid = {
        timeoutSeconds: "60",
      };
      expect(() => WatchOptionsSchema.parse(invalid)).toThrow();
    });
  });

  describe("ListOptionsSchema", () => {
    it("should validate empty list options", () => {
      const valid = {};
      expect(() => ListOptionsSchema.parse(valid)).not.toThrow();
    });

    it("should validate full list options", () => {
      const valid = {
        namespace: "default",
        labelSelector: "app=myapp,env=prod",
        fieldSelector: "metadata.name=my-pod",
        limit: 100,
        continue: "continue-token",
      };
      expect(() => ListOptionsSchema.parse(valid)).not.toThrow();
    });

    it("should validate partial list options", () => {
      expect(() =>
        ListOptionsSchema.parse({ namespace: "kube-system" }),
      ).not.toThrow();
      expect(() => ListOptionsSchema.parse({ limit: 50 })).not.toThrow();
    });

    it("should reject invalid limit type", () => {
      const invalid = {
        limit: "50",
      };
      expect(() => ListOptionsSchema.parse(invalid)).toThrow();
    });
  });
});
