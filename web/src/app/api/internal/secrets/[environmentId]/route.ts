/**
 * Internal Secrets API Endpoint
 *
 * Provides resolved secrets to the Kubernetes operator for environment deployments.
 * This endpoint is called by the operator during environment reconciliation to inject
 * secrets into pods.
 *
 * Flow:
 * 1. Operator sends request with ServiceAccount token in Authorization header
 * 2. Validate token using Kubernetes TokenReview API
 * 3. Look up environment by ID and verify it exists
 * 4. Resolve secrets with precedence (environment > project > team)
 * 5. Return decrypted secrets as flat key-value map
 *
 * Security:
 * - Operator authenticates via ServiceAccount token
 * - TokenReview API validates operator identity
 * - Secrets are decrypted only when sent to authenticated operator
 * - All operations are logged (without secret values)
 *
 * Based on: specs/001-environments/spec.md (FR-ENV-037)
 */

import { NextRequest, NextResponse } from "next/server";
import { getClusterConfig } from "@/lib/k8s-client";
import { AuthenticationV1Api } from "@kubernetes/client-node";
import { z } from "zod";
import { db } from "@/db";
import { projectEnvironments, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveSecretsForEnvironment } from "@/models/secrets";
import { logger } from "@/lib/logging";

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
  error: z.string().optional(),
});

/**
 * Schema for TokenReview response
 */
const TokenReviewResponseSchema = z.object({
  status: TokenReviewStatusSchema.optional(),
});

/**
 * Validate operator request using Kubernetes TokenReview API
 *
 * @param token ServiceAccount token from Authorization header
 * @returns True if token is valid, false otherwise
 */
async function validateOperatorToken(token: string): Promise<boolean> {
  try {
    // Get Kubernetes config
    const kc = await getClusterConfig();
    if (!kc) {
      logger.error("Kubernetes config not available for TokenReview");
      return false;
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
      logger.error("Invalid TokenReview response format", {
        error: parsedResponse.error,
      });
      return false;
    }

    // Check if token is authenticated
    if (!parsedResponse.data.status?.authenticated) {
      logger.warn("TokenReview authentication failed", {
        error: parsedResponse.data.status?.error,
      });
      return false;
    }

    logger.info("Operator token validated successfully", {
      username: parsedResponse.data.status.user?.username,
    });

    return true;
  } catch (error) {
    logger.error("TokenReview validation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Extract Bearer token from Authorization header
 *
 * @param request NextRequest
 * @returns Token string or null if not found
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * GET /api/internal/secrets/[environmentId]
 *
 * Returns resolved secrets for an environment in flat key-value format.
 * Requires valid ServiceAccount token authentication.
 *
 * Response format:
 * {
 *   "secrets": {
 *     "GITHUB_APP_ID": "123456",
 *     "GITHUB_APP_PRIVATE_KEY": "-----BEGIN RSA...",
 *     "DATABASE_URL": "postgresql://..."
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ environmentId: string }> },
) {
  const { environmentId } = await params;

  try {
    // 1. Authenticate operator using K8s TokenReview
    const token = extractBearerToken(request);
    if (!token) {
      logger.warn("Missing authorization token for secrets request", {
        environmentId,
      });
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 },
      );
    }

    const isValid = await validateOperatorToken(token);
    if (!isValid) {
      logger.warn("Invalid operator token for secrets request", {
        environmentId,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Look up environment and get team/project IDs
    const environment = await db
      .select({
        id: projectEnvironments.id,
        projectId: projectEnvironments.projectId,
        teamId: projects.teamId,
      })
      .from(projectEnvironments)
      .innerJoin(projects, eq(projectEnvironments.projectId, projects.id))
      .where(eq(projectEnvironments.id, environmentId))
      .limit(1);

    if (!environment.length) {
      logger.warn("Environment not found for secrets request", {
        environmentId,
      });
      return NextResponse.json(
        { error: "Environment not found" },
        { status: 404 },
      );
    }

    const { teamId, projectId } = environment[0];

    // 3. Resolve secrets with precedence
    logger.info("Resolving secrets for environment", {
      environmentId,
      teamId,
      projectId,
    });

    const resolvedSecrets = await resolveSecretsForEnvironment(
      teamId,
      projectId,
      environmentId,
    );

    // 4. Convert Map to flat object for JSON response
    const secretsObject: Record<string, string> = {};
    for (const [name, secret] of resolvedSecrets.entries()) {
      secretsObject[name] = secret.value;
    }

    logger.info("Successfully resolved secrets for environment", {
      environmentId,
      teamId,
      projectId,
      secretCount: resolvedSecrets.size,
    });

    return NextResponse.json({
      secrets: secretsObject,
    });
  } catch (error) {
    logger.error("Failed to resolve secrets for environment", {
      environmentId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to resolve secrets" },
      { status: 500 },
    );
  }
}
