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
import { AuthenticationV1Api, CustomObjectsApi } from "@kubernetes/client-node";
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
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
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

/**
 * Schema for Namespace metadata
 */
const NamespaceMetadataSchema = z.object({
  name: z.string().optional(),
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for Namespace
 */
const NamespaceSchema = z.object({
  metadata: NamespaceMetadataSchema.optional(),
});

/**
 * Schema for Project CR spec
 */
const ProjectSpecSchema = z.object({
  githubInstallationId: z.string().optional(),
});

/**
 * Schema for Project Custom Resource
 */
const ProjectCRSchema = z.object({
  metadata: EnvironmentMetadataSchema.optional(),
  spec: ProjectSpecSchema.optional(),
});

interface ValidationResult {
  valid: boolean;
  namespace?: string;
  installationId?: string;
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
async function validatePodRequest(token: string): Promise<ValidationResult> {
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
    if (
      parts.length < 3 ||
      parts[0] !== "system" ||
      parts[1] !== "serviceaccount"
    ) {
      return {
        valid: false,
        error: "Invalid ServiceAccount username format",
      };
    }

    const namespace = parts[2];

    // Look up Project CR via namespace labels to get installation ID
    // The installation ID binding must be deterministic: if we cannot derive
    // an installation ID for the caller namespace, we fail the request rather
    // than falling back to the route parameter.
    const installationId = await getInstallationIdForNamespace(namespace);

    if (!installationId) {
      return {
        valid: false,
        error:
          "No GitHub installation ID is associated with the caller namespace",
      };
    }

    return {
      valid: true,
      namespace,
      installationId,
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
 * This looks up the namespace labels to find the team/project, then fetches
 * the Project CR and extracts the githubInstallationId from its spec.
 * This provides deterministic validation of the installation binding.
 *
 * @param namespace Kubernetes namespace
 * @returns Installation ID or null if not found
 */
async function getInstallationIdForNamespace(
  namespace: string,
): Promise<string | null> {
  try {
    // Get Kubernetes config
    const kc = await getClusterConfig();
    if (!kc) {
      return null;
    }

    const coreApi = kc.makeApiClient(
      (await import("@kubernetes/client-node")).CoreV1Api,
    );
    const customApi = kc.makeApiClient(CustomObjectsApi);

    // Get namespace to read labels
    const nsResponse = await coreApi.readNamespace({ name: namespace });
    const parsedNamespace = NamespaceSchema.safeParse(nsResponse);
    if (!parsedNamespace.success) {
      console.error("Invalid Namespace response format");
      return null;
    }

    // Extract team and project from namespace labels
    const teamLabel = parsedNamespace.data.metadata?.labels?.["catalyst.dev/team"];
    const projectLabel = parsedNamespace.data.metadata?.labels?.["catalyst.dev/project"];

    if (!teamLabel || !projectLabel) {
      console.warn(
        "Namespace missing required hierarchy labels (catalyst.dev/team, catalyst.dev/project)",
        { namespace },
      );
      return null;
    }

    // Fetch Project CR from team namespace
    try {
      const projectResponse = await customApi.getNamespacedCustomObject({
        group: "catalyst.catalyst.dev",
        version: "v1alpha1",
        namespace: teamLabel,
        plural: "projects",
        name: projectLabel,
      });

      const parsedProject = ProjectCRSchema.safeParse(projectResponse);
      if (!parsedProject.success) {
        console.error("Invalid Project CR response format");
        return null;
      }

      const githubInstallationId = parsedProject.data.spec?.githubInstallationId;
      if (!githubInstallationId) {
        console.warn("Project CR missing githubInstallationId", {
          team: teamLabel,
          project: projectLabel,
        });
        return null;
      }

      return githubInstallationId;
    } catch (error) {
      console.error("Error fetching Project CR:", error);
      return null;
    }
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
 *
 * Special case: When installationId is "pat", returns the configured GITHUB_PAT
 * directly for local development scenarios where a GitHub App is not configured.
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve params
    const { installationId: installationIdStr } = await params;

    // Verify pod belongs to this installation
    // The installation ID from the namespace must match the requested one
    if (validation.installationId !== installationIdStr) {
      console.error(
        `Installation ID mismatch: pod has ${validation.installationId}, requested ${installationIdStr}`,
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle PAT mode for local development
    // When installationId is "pat", return the configured GITHUB_PAT directly
    // This is only enabled in development mode for security reasons
    if (installationIdStr === "pat") {
      const { GITHUB_CONFIG } = await import("@/lib/vcs-providers");

      // PAT mode must be explicitly enabled to prevent credential exfiltration
      const patModeEnabled =
        process.env.ENABLE_GIT_TOKEN_PAT_MODE === "true" ||
        process.env.NODE_ENV === "development";

      if (!patModeEnabled) {
        console.error(
          "PAT mode requested but not enabled (set ENABLE_GIT_TOKEN_PAT_MODE=true or NODE_ENV=development)",
        );
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (!GITHUB_CONFIG.PAT) {
        console.error("PAT mode requested but GITHUB_PAT is not configured");
        return NextResponse.json(
          { error: "GITHUB_PAT not configured" },
          { status: 500 },
        );
      }

      // Audit log: Log PAT token request
      console.log("GitHub PAT returned for pod", {
        namespace: validation.namespace,
        mode: "pat",
        timestamp: new Date().toISOString(),
      });

      return new NextResponse(GITHUB_CONFIG.PAT, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-store",
          "Pragma": "no-cache",
        },
      });
    }

    const requestedInstallationId = parseInt(installationIdStr, 10);

    if (isNaN(requestedInstallationId)) {
      return NextResponse.json(
        { error: "Invalid installation ID" },
        { status: 400 },
      );
    }

    // Generate fresh GitHub App installation token
    const githubToken = await generateInstallationToken(
      requestedInstallationId,
    );

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
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
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
