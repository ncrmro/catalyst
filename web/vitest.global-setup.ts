// vitest.global-setup.ts
import dotenv from "dotenv";

export async function setup() {
  // Load environment variables from .env file
  dotenv.config();

  console.log("Vitest global setup: Environment variables loaded from .env");

  if (process.env.KUBECONFIG_PRIMARY) {
    console.log(
      "Vitest global setup: KUBECONFIG_PRIMARY environment variable is available",
    );
  } else {
    console.warn(
      "Vitest global setup: KUBECONFIG_PRIMARY environment variable is NOT available",
    );
  }
}

export function teardown() {
  console.log("Vitest global teardown: Cleaning up...");
}
