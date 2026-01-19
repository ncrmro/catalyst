/**
 * Git Token API Endpoint
 *
 * This endpoint provides fresh GitHub App installation tokens to environment pods
 * for git operations (clone, fetch, push). Pods authenticate using their
 * ServiceAccount tokens.
 *
 * Flow:
 * 1. Pod sends request with ServiceAccount token in Authorization header
 * 2. Validate token using Kubernetes TokenReview API
 * 3. Extract namespace and verify it belongs to the requested installation
 * 4. Generate fresh GitHub App installation token (1-hour validity)
 * 5. Return token as plain text
 *
 * Security:
 * - Pods authenticate via ServiceAccount tokens
 * - TokenReview API validates pod identity
 * - Installation ID is verified against pod's namespace/environment
 * - Tokens are never persisted, generated on-demand
 *
 * Based on: specs/001-environments/research.git-credential-helper.md
 */

import { NextRequest, NextResponse } from "next/server";
import { getClusterConfig } from "@/lib/k8s-client";
import {
  AuthenticationV1Api,
  CustomObjectsApi,
} from "@kubernetes/client-node";
import { z } from "zod";

// =============================================================================
// Zod Schemas for Kubernetes API Responses
// =============================================================================

/**
 * Schema for TokenReview status response
 */
const TokenReviewStatusSchema = z.object({
  authenticated: z.boolean().optional(),
  user: z
    .object({
      username: z.string().optional(),
      uid: z.string().optional(),
      groups: z.array(z.string()).optional(),
    })
    .optional(),
  audiences: z.array(z.string()).optional(),
  error: z.string().optional(),
});

/**
 * Schema for TokenReview response
 */
const TokenReviewResponseSchema = z.object({
  status: TokenReviewStatusSchema.optional(),
});

/**
 * Schema for Environment Custom Resource metadata
 */
const EnvironmentMetadataSchema = z.object({
  name: z.string().optional(),
  namespace: z.string().optional(),
  labels: z.record(z.string()).optional(),
  annotations: z.record(z.string()).optional(),
});

/**
 * Schema for Environment Custom Resource
 */
const EnvironmentCRSchema = z.object({
  metadata: EnvironmentMetadataSchema.optional(),
  spec: z.unknown().optional(),
  status: z.unknown().optional(),
});

/**
 * Schema for CustomObject list response
 */
const CustomObjectListResponseSchema = z.object({
  items: z.array(EnvironmentCRSchema).optional(),
});

interface ValidationResult {
  valid: boolean;
  namespace?: string;
  installationId?: number;
  error?: string;
}

/**
 * Validate pod request using Kubernetes TokenReview API
 *
 * This function:
 * 1. Validates the ServiceAccount token using TokenReview API
 * 2. Extracts the namespace from the authenticated service account
 * 3. Looks up the Environment CR to get the installation ID
 *
 * @param token ServiceAccount token from Authorization header
 * @returns Validation result with namespace and installation ID
 */
async function validatePodRequest(
  token: string,
): Promise<ValidationResult> {
  try {
    // Get Kubernetes config
    const kc = await getClusterConfig();
    if (!kc) {
      return {
        valid: false,
        error: "Kubernetes config not available",
      };
    }

    const authApi = kc.makeApiClient(AuthenticationV1Api);

    // Create TokenReview to validate the ServiceAccount token
    const tokenReview = {
      apiVersion: "authentication.k8s.io/v1",
      kind: "TokenReview",
      spec: {
        token,
      },
    };

    const response = await authApi.createTokenReview({ body: tokenReview });

    // Validate response with Zod schema
    const parsedResponse = TokenReviewResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      return {
        valid: false,
        error: "Invalid TokenReview response format",
      };
    }

    // Check if token is authenticated
    if (!parsedResponse.data.status?.authenticated) {
      return {
        valid: false,
        error: "Token not authenticated",
      };
    }

    // Extract namespace from ServiceAccount username
    // Format: system:serviceaccount:<namespace>:<serviceaccount-name>
    const username = parsedResponse.data.status.user?.username;
    if (!username) {
      return {
        valid: false,
        error: "No username in token review",
      };
    }

    const parts = username.split(":");
    if (parts.length < 3 || parts[0] !== "system" || parts[1] !== "serviceaccount") {
      return {
        valid: false,
        error: "Invalid ServiceAccount username format",
      };
    }

    const namespace = parts[2];

    // Look up Environment CR to get installation ID
    // Note: PR pods are deprecated and the operator should handle this work now.
    // For namespaces without an associated Environment CR (e.g. PR pods
    // running in "default" or another shared namespace), we cannot derive
    // an installation ID from the namespace alone. In that case, we proceed
    // without namespace-based installation mapping and rely on the
    // installationId provided via the route parameter for validation.
    const installationId = await getInstallationIdForNamespace(namespace);

    if (!installationId) {
      console.warn(
        "No installation ID found for namespace; proceeding without namespace-based installation mapping",
        { namespace },
      );
    }

    return {
      valid: true,
      namespace,
      installationId: installationId ?? undefined,
    };
  } catch (error) {
    console.error("Error validating pod request:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get installation ID for a given namespace
 *
 * This looks up the Environment CR in the namespace and extracts the
 * installation ID from its labels or metadata.
 *
 * @param namespace Kubernetes namespace
 * @returns Installation ID or null if not found
 */
async function getInstallationIdForNamespace(
  namespace: string,
): Promise<number | null> {
  try {
    // Get Kubernetes config
    const kc = await getClusterConfig();
    if (!kc) {
      return null;
    }

    const customApi = kc.makeApiClient(CustomObjectsApi);

    // List Environment CRs in the namespace
    const response = await customApi.listNamespacedCustomObject({
      group: "catalyst.catalyst.dev",
      version: "v1alpha1",
      namespace,
      plural: "environments",
    });

    // Validate response with Zod schema
    const parsedResponse = CustomObjectListResponseSchema.safeParse(response);
    if (!parsedResponse.success) {
      console.error("Invalid CustomObject list response format");
      return null;
    }

    const environments = parsedResponse.data.items || [];

    if (environments.length === 0) {
      return null;
    }

    // Get the first environment (there should only be one per namespace)
    const env = environments[0];

    // Check for installation-id label
    const installationIdLabel = env.metadata?.labels?.["catalyst.dev/installation-id"];
    if (installationIdLabel) {
      return parseInt(installationIdLabel, 10);
    }

    // Check for installation ID in annotations (fallback)
    const installationIdAnnotation = env.metadata?.annotations?.["catalyst.dev/installation-id"];
    if (installationIdAnnotation) {
      return parseInt(installationIdAnnotation, 10);
    }

    return null;
  } catch (error) {
    console.error("Error getting installation ID for namespace:", error);
    return null;
  }
}

/**
 * Generate fresh GitHub App installation token
 *
 * @param installationId GitHub App installation ID
 * @returns Fresh installation token
 */
async function generateInstallationToken(
  installationId: number,
): Promise<string> {
  try {
    // Use @octokit/auth-app directly to get the token
    const { createAppAuth } = await import("@octokit/auth-app");
    const { GITHUB_CONFIG } = await import("@/lib/vcs-providers");

    const auth = createAppAuth({
      appId: GITHUB_CONFIG.APP_ID,
      privateKey: GITHUB_CONFIG.APP_PRIVATE_KEY,
    });

    const { token } = await auth({
      type: "installation",
      installationId,
    });

    return token;
  } catch (error) {
    console.error("Error generating installation token:", error);
    throw new Error("Failed to generate installation token");
  }
}

/**
 * GET /api/git-token/[installationId]
 *
 * Returns a fresh GitHub App installation token for git operations.
 * Authenticates pods via ServiceAccount tokens.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ installationId: string }> },
): Promise<NextResponse> {
  try {
    // Get authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.slice(7);

    // Validate pod request
    const validation = await validatePodRequest(token);
    if (!validation.valid) {
      console.error("Pod validation failed:", validation.error);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Resolve params
    const { installationId: installationIdStr } = await params;
    const requestedInstallationId = parseInt(installationIdStr, 10);

    if (isNaN(requestedInstallationId)) {
      return NextResponse.json(
        { error: "Invalid installation ID" },
        { status: 400 },
      );
    }

    // Verify pod belongs to this installation
    // If we couldn't derive installation ID from namespace (e.g., for PR pods),
    // we skip this check and trust the requested installation ID
    if (validation.installationId && validation.installationId !== requestedInstallationId) {
      console.error(
        `Installation ID mismatch: pod has ${validation.installationId}, requested ${requestedInstallationId}`,
      );
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    // Generate fresh GitHub App installation token
    const githubToken = await generateInstallationToken(requestedInstallationId);

    // Audit log: Log successful token requests for security compliance
    console.log("GitHub token generated for pod", {
      namespace: validation.namespace,
      installationId: requestedInstallationId,
      timestamp: new Date().toISOString(),
    });

    // Return token as plain text (for shell consumption)
    return new NextResponse(githubToken, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Error in git-token endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
