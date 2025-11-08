// vitest.global-setup.ts
import dotenv from "dotenv";

export function setup() {
  // Load environment variables from .env file
  dotenv.config();

  // Display a message that environment variables are loaded
  console.log("Vitest global setup: Environment variables loaded from .env");

  // Log that KUBECONFIG_PRIMARY is available (without revealing contents)
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
