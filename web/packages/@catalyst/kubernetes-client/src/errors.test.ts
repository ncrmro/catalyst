import { describe, it, expect } from "vitest";
import { KubernetesError } from "./errors";

describe("KubernetesError.fromApiError", () => {
  it("should parse HttpError with .body and .statusCode", () => {
    const error = {
      statusCode: 404,
      body: {
        kind: "Status",
        apiVersion: "v1",
        status: "Failure",
        message: 'namespaces "nicholas-romero-s-team" not found',
        reason: "NotFound",
        details: {
          name: "nicholas-romero-s-team",
          kind: "namespaces",
        },
        code: 404,
      },
    };

    const k8sError = KubernetesError.fromApiError(error);

    expect(k8sError).toBeInstanceOf(KubernetesError);
    expect(k8sError.code).toBe(404);
    expect(k8sError.reason).toBe("NotFound");
    expect(k8sError.message).toContain("nicholas-romero-s-team");
    expect(k8sError.details).toBeDefined();
    expect(k8sError.details?.name).toBe("nicholas-romero-s-team");
    expect(k8sError.details?.kind).toBe("namespaces");
  });

  it("should correctly identify 404 errors", () => {
    const error = {
      statusCode: 404,
      body: {
        code: 404,
        reason: "NotFound",
        message: "namespace not found",
      },
    };

    const k8sError = KubernetesError.fromApiError(error);

    expect(KubernetesError.isNotFound(k8sError)).toBe(true);
  });

  it("should correctly identify 409 conflicts", () => {
    const error = {
      statusCode: 409,
      body: {
        code: 409,
        reason: "AlreadyExists",
        message: "namespace already exists",
      },
    };

    const k8sError = KubernetesError.fromApiError(error);

    expect(KubernetesError.isConflict(k8sError)).toBe(true);
  });

  it("should handle generic Error objects", () => {
    const error = new Error("Some generic error");

    const k8sError = KubernetesError.fromApiError(error);

    expect(k8sError.code).toBe(500);
    expect(k8sError.message).toBe("Some generic error");
  });

  it("should return same error if already KubernetesError", () => {
    const original = new KubernetesError("test", 404, "NotFound");

    const result = KubernetesError.fromApiError(original);

    expect(result).toBe(original);
  });

  it("should handle unknown error types", () => {
    const k8sError = KubernetesError.fromApiError("string error");

    expect(k8sError.code).toBe(500);
    expect(k8sError.message).toBe("Unknown error");
  });
});
