/**
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { cloudAccounts } from "@/db/schema";
import { cloudAccountFactory } from "../factories";

describe("cloudAccounts schema", () => {
  it("should have all expected columns", () => {
    const columns = getTableColumns(cloudAccounts);
    const columnNames = Object.keys(columns);

    expect(columnNames).toContain("id");
    expect(columnNames).toContain("teamId");
    expect(columnNames).toContain("provider");
    expect(columnNames).toContain("name");
    expect(columnNames).toContain("status");
    expect(columnNames).toContain("externalAccountId");
    expect(columnNames).toContain("credentialEncrypted");
    expect(columnNames).toContain("credentialIv");
    expect(columnNames).toContain("credentialAuthTag");
    expect(columnNames).toContain("credentialType");
    expect(columnNames).toContain("resourcePrefix");
    expect(columnNames).toContain("lastValidatedAt");
    expect(columnNames).toContain("lastError");
    expect(columnNames).toContain("createdBy");
    expect(columnNames).toContain("createdAt");
    expect(columnNames).toContain("updatedAt");
  });
});

describe("cloudAccountFactory", () => {
  it("should build with default status pending", () => {
    const account = cloudAccountFactory.build();
    expect(account.status).toBe("pending");
    expect(account.provider).toBeDefined();
    expect(account.name).toBeDefined();
  });

  it("should build AWS account with 12-digit external ID", () => {
    const account = cloudAccountFactory.aws().build();
    expect(account.provider).toBe("aws");
    expect(account.externalAccountId).toMatch(/^\d{12}$/);
    expect(account.credentialType).toBe("iam_role");
  });

  it("should build GCP account with service_account credential type", () => {
    const account = cloudAccountFactory.gcp().build();
    expect(account.provider).toBe("gcp");
    expect(account.credentialType).toBe("service_account");
  });

  it("should build Azure account", () => {
    const account = cloudAccountFactory.azure().build();
    expect(account.provider).toBe("azure");
    expect(account.credentialType).toBe("service_account");
  });

  it("should build active account with lastValidatedAt", () => {
    const account = cloudAccountFactory.active().build();
    expect(account.status).toBe("active");
    expect(account.lastValidatedAt).toBeInstanceOf(Date);
  });
});
