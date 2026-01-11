/**
 * Example: Using Zod schemas for runtime validation
 *
 * This example demonstrates how to use Zod schemas to validate
 * Environment resources at runtime, useful for:
 * - Validating API responses
 * - Validating configuration files
 * - Ensuring data integrity when working with untrusted data
 */

import { createEnvironmentClient } from "../environments/index";
import {
  EnvironmentSchema,
  validateEnvironment,
  safeValidateEnvironment,
  validateEnvironmentList,
} from "../types/environment.zod";
import type { Environment } from "../types/environment";

/**
 * Example 1: Basic validation with error handling
 */
async function basicValidation() {
  const client = await createEnvironmentClient();
  const env = await client.get("my-env", "default");

  if (!env) {
    throw new Error("Environment not found");
  }

  try {
    // Validate and parse the environment
    const validatedEnv = validateEnvironment(env);
    console.log("✅ Environment is valid:", validatedEnv.metadata.name);
    return validatedEnv;
  } catch (error) {
    console.error("❌ Validation failed:", error);
    throw error;
  }
}

/**
 * Example 2: Safe validation without throwing errors
 */
async function safeValidation() {
  const client = await createEnvironmentClient();
  const env = await client.get("my-env", "default");

  if (!env) {
    return null;
  }

  // Safe parse returns a result object
  const result = safeValidateEnvironment(env);

  if (result.success) {
    console.log("✅ Environment is valid:", result.data.metadata.name);
    return result.data;
  } else {
    console.error("❌ Validation errors:", result.error.issues);
    // Handle validation errors gracefully
    return null;
  }
}

/**
 * Example 3: Validating a list of environments
 */
async function validateList() {
  const client = await createEnvironmentClient();
  const envList = await client.list({ namespace: "default" });

  try {
    const validatedList = validateEnvironmentList(envList);
    console.log(
      `✅ Validated ${validatedList.items.length} environments`,
    );
    return validatedList;
  } catch (error) {
    console.error("❌ List validation failed:", error);
    throw error;
  }
}

/**
 * Example 4: Validating configuration from a file or external source
 */
function validateExternalData(data: unknown): Environment {
  try {
    // This ensures the data conforms to the Environment schema
    const validatedEnv = EnvironmentSchema.parse(data);
    console.log("✅ External data is valid");
    return validatedEnv;
  } catch (error) {
    console.error("❌ External data validation failed:", error);
    throw new Error("Invalid environment configuration");
  }
}

/**
 * Example 5: Partial validation of specific fields
 */
import { EnvironmentSpecSchema } from "../types/environment.zod";

function validateSpec(spec: unknown) {
  try {
    const validatedSpec = EnvironmentSpecSchema.parse(spec);
    console.log("✅ Spec is valid");
    return validatedSpec;
  } catch (error) {
    console.error("❌ Spec validation failed:", error);
    throw error;
  }
}

/**
 * Example 6: Using validation in a function that accepts untrusted data
 */
async function createEnvironmentFromUntrustedData(
  data: unknown,
): Promise<Environment> {
  // First, validate the input data
  const result = safeValidateEnvironment(data);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new Error(`Invalid environment data: ${errorMessages}`);
  }

  // Now we know the data is valid, create it
  const client = await createEnvironmentClient();

  // Remove status field for creation (EnvironmentInput)
  const { status: _status, ...envInput } = result.data;

  return await client.create(envInput);
}

/**
 * Example 7: Type-safe environment creation with validation
 */
async function createValidatedEnvironment() {
  const envData = {
    apiVersion: "catalyst.catalyst.dev/v1alpha1",
    kind: "Environment",
    metadata: {
      name: "test-env",
      namespace: "default",
    },
    spec: {
      projectRef: { name: "my-project" },
      type: "development",
      deploymentMode: "workspace",
      sources: [
        {
          name: "web",
          commitSha: "abc123",
          branch: "feature/new-thing",
          prNumber: 42,
        },
      ],
      config: {
        envVars: [
          { name: "NODE_ENV", value: "development" },
          { name: "DEBUG", value: "true" },
        ],
        image: "ghcr.io/ncrmro/catalyst:latest",
      },
    },
  };

  // Validate before creating
  const validatedData = validateEnvironment(envData);

  const client = await createEnvironmentClient();
  const { status: _status, ...envInput } = validatedData;

  return await client.create(envInput);
}

// Export examples
export {
  basicValidation,
  safeValidation,
  validateList,
  validateExternalData,
  validateSpec,
  createEnvironmentFromUntrustedData,
  createValidatedEnvironment,
};
