/**
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { managedClusters, nodePools } from "@/db/schema";
import { managedClusterFactory, nodePoolFactory } from "../factories";

describe("managedClusters schema", () => {
  it("should have all expected columns", () => {
    const columns = getTableColumns(managedClusters);
    const columnNames = Object.keys(columns);

    expect(columnNames).toContain("id");
    expect(columnNames).toContain("cloudAccountId");
    expect(columnNames).toContain("teamId");
    expect(columnNames).toContain("name");
    expect(columnNames).toContain("status");
    expect(columnNames).toContain("region");
    expect(columnNames).toContain("kubernetesVersion");
    expect(columnNames).toContain("config");
    expect(columnNames).toContain("kubeconfigEncrypted");
    expect(columnNames).toContain("kubeconfigIv");
    expect(columnNames).toContain("kubeconfigAuthTag");
    expect(columnNames).toContain("deletionProtection");
    expect(columnNames).toContain("deleteGracePeriodEnds");
    expect(columnNames).toContain("createdBy");
    expect(columnNames).toContain("createdAt");
    expect(columnNames).toContain("updatedAt");
  });
});

describe("managedClusterFactory", () => {
  it("should build with default status provisioning and deletionProtection true", () => {
    const cluster = managedClusterFactory.build();
    expect(cluster.status).toBe("provisioning");
    expect(cluster.deletionProtection).toBe(true);
  });

  it("should build active cluster", () => {
    const cluster = managedClusterFactory.active().build();
    expect(cluster.status).toBe("active");
  });
});

describe("nodePoolFactory", () => {
  it("should build with spotEnabled false", () => {
    const pool = nodePoolFactory.build();
    expect(pool.spotEnabled).toBe(false);
  });
});

describe("nodePools schema", () => {
  it("should have all expected columns", () => {
    const columns = getTableColumns(nodePools);
    const columnNames = Object.keys(columns);

    expect(columnNames).toContain("id");
    expect(columnNames).toContain("clusterId");
    expect(columnNames).toContain("name");
    expect(columnNames).toContain("instanceType");
    expect(columnNames).toContain("minNodes");
    expect(columnNames).toContain("maxNodes");
    expect(columnNames).toContain("currentNodes");
    expect(columnNames).toContain("spotEnabled");
    expect(columnNames).toContain("status");
    expect(columnNames).toContain("createdAt");
    expect(columnNames).toContain("updatedAt");
  });
});
